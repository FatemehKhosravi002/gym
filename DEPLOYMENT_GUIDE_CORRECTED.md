# راهنمای استقرار تصحیح‌شده Gym Program Builder

## نکته درباره ایران (مهم)
اگر Docker Hub، GitHub، pip یا npm در سرور کند یا بلاک شده‌اند:

1. **Registry Mirror برای Docker**: در `/etc/docker/daemon.json` اضافه کنید:
```json
{
  "registry-mirrors": ["https://docker.arvancloud.ir", "https://mirror.gcr.io"]
}
```
سپس `sudo systemctl restart docker`

2. **pip mirror**: `pip install -i https://mirror.pypi.org/simple/` یا تنظیم `~/.pip/pip.conf`

3. **npm mirror**: `npm config set registry https://registry.npmmirror.com`

4. **Fallback با docker save/load**: روی سیستم محلی بیلد کنید و منتقل کنید:
```bash
# محلی
docker save gym_backend gym_frontend -o images.tar
scp images.tar user@SERVER:/home/user/
# سرور
docker load -i images.tar
```

## ترتیب استقرار صحیح

### فاز ۱: آماده‌سازی سرور
```bash
ssh root@YOUR_SERVER_IP
adduser gymuser && usermod -aG sudo gymuser
# SSH key setup
sudo ufw allow OpenSSH && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw enable
sudo apt update && sudo apt upgrade -y
# نصب Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker gymuser
newgrp docker
```

**تایید لاگین با کلید در ترمینال دوم قبل از غیرفعال کردن پسورد:**
```bash
# ترمینال دوم
ssh -i ~/.ssh/your_key gymuser@YOUR_SERVER_IP
# فقط بعد از موفقیت این تست، PermitRootLogin no و PasswordAuthentication no را فعال کنید
```

### فاز ۲: آماده‌سازی پروژه و تنظیمات
```bash
su - gymuser
cd /home/gymuser
git clone YOUR_REPO_URL gym
cd gym
cp .env.example.prod .env
nano .env  # همه مقادیر را با مقادیر واقعی پر کنید (POSTGRES_*, SECRET_KEY, DOMAIN)
cp backend/.env.example backend/.env.production
nano backend/.env.production
```

**تولید SECRET_KEY:**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(50))"
```

### فاز ۳: HTTPS Bootstrap (مرحله اول - HTTP فقط)
```bash
mkdir -p certbot/conf certbot/www
cp nginx/nginx.http.conf nginx/nginx.prod.conf.bak 2>/dev/null || true
cp nginx/nginx.http.conf /tmp/nginx.http.active.conf
# استفاده از کانفیگ HTTP موقت
docker compose -f docker-compose.prod.yml up -d nginx
# دریافت گواهی
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot --webroot-path=/var/www/certbot \
  -d example.com -d www.example.com \
  --email your-email@example.com --agree-tos --no-eff-email
```

### فاز ۴: فعال‌سازی HTTPS (مرحله دوم)
```bash
# کپی کانفیگ HTTPS نهایی
cp nginx/nginx.prod.conf /home/gymuser/gym/nginx/nginx.prod.conf
docker compose -f docker-compose.prod.yml exec nginx nginx -t
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
# یا ریستارت
docker compose -f docker-compose.prod.yml restart nginx
```

### فاز ۵: بیلد و راه‌اندازی
```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate --noinput
docker compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
docker compose -f docker-compose.prod.yml exec backend python manage.py seed_exercises
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

### فاز ۶: تایید فونت Vazirmatn در PDF
```bash
# بعد از ایجاد یک برنامه، PDF بسازید و بررسی کنید
# یا از داخل کانتینر:
docker compose -f docker-compose.prod.yml exec backend python manage.py shell -c "
# تست ساده - بررسی فونت
import subprocess
subprocess.run(['fc-list', '|', 'grep', '-i', 'vazir'], shell=True)
"
# بررسی PDF: باید شامل نام فونت Vazirmatn باشد
pdfinfo /path/to/generated.pdf 2>&1 | grep -i font || strings /path/to/generated.pdf | grep -i vazir | head -2
```

### فاز ۷: Cron ها
```bash
crontab -e
# اضافه کنید:
0 2 * * * /home/gymuser/gym/backup_full.sh >> /home/gymuser/backups/backup.log 2>&1
0 3 * * * cd /home/gymuser/gym && docker compose -f docker-compose.prod.yml exec -T backend python manage.py purge_trash >> /home/gymuser/backups/purge.log 2>&1
0 4 * * 0 docker compose -f docker-compose.prod.yml exec nginx nginx -s reload >> /home/gymuser/backups/nginx_reload.log 2>&1
```

### فاز ۸: کپی بک‌آپ به کامپیوتر شخصی
```bash
# روی کامپیوتر محلی
rsync -avz gymuser@YOUR_SERVER_IP:/home/gymuser/backups/ ./backups/
# یا scp
scp gymuser@YOUR_SERVER_IP:/home/gymuser/backups/*.gz ./backups/
```

### بازیابی
**بازیابی دیتابیس:**
```bash
docker compose -f docker-compose.prod.yml stop backend
zcat /home/gymuser/backups/gym_db_YYYYMMDD_HHMMSS.sql.gz | docker compose -f docker-compose.prod.yml exec -T db psql -U $POSTGRES_USER -d $POSTGRES_DB
docker compose -f docker-compose.prod.yml start backend
```

**بازیابی media:**
```bash
docker run --rm -v gym_media_data_prod:/data -v /home/gymuser/backups:/backup alpine sh -c "cd /data && rm -rf * && tar -xzf /backup/gym_media_YYYYMMDD_HHMMSS.tar.gz"
```

### تایید تمدید SSL
```bash
docker compose -f docker-compose.prod.yml run --rm certbot renew --dry-run
# بررسی لاگ
docker compose -f docker-compose.prod.yml logs certbot
```

## چک‌لیست نهایی اولین استقرار (حداکثر ۱۵ دستور)
1. `ssh gymuser@SERVER_IP`
2. `cd ~/gym && cp .env.example.prod .env && nano .env`
3. `mkdir -p certbot/conf certbot/www && docker compose -f docker-compose.prod.yml up -d nginx`
4. `docker compose -f docker-compose.prod.yml run --rm certbot certonly --webroot -w /var/www/certbot -d example.com -d www.example.com --email EMAIL --agree-tos --no-eff-email`
5. `docker compose -f docker-compose.prod.yml restart nginx`
6. `docker compose -f docker-compose.prod.yml build`
7. `docker compose -f docker-compose.prod.yml up -d`
8. `docker compose -f docker-compose.prod.yml exec backend python manage.py migrate --noinput`
9. `docker compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput`
10. `docker compose -f docker-compose.prod.yml exec backend python manage.py seed_exercises`
11. `docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser`
12. `curl -I https://example.com`
13. `docker compose -f docker-compose.prod.yml run --rm certbot renew --dry-run`
14. `crontab -e` (اضافه کردن ۳ cron)
15. `ssh gymuser@SERVER_IP` در ترمینال دوم برای تایید - بعد غیرفعال کردن پسورد SSH
