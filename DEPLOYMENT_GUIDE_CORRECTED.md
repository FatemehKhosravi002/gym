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
nano .env  # همه مقادیر را با مقادیر واقعی پر کنید (POSTGRES_*, DB_*, SECRET_KEY, ALLOWED_HOSTS, FRONTEND_BASE_URL)
chmod 600 .env
mkdir -p certbot/conf certbot/www backups
```

> فقط همین یک فایل `.env` خوانده می‌شود؛ فایل `backend/.env.production` دیگر لازم نیست
> (و نباید سکرت‌ها را در دو جا نگه دارید).

**تولید SECRET_KEY:**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(50))"
```

### فاز ۳: دریافت گواهی SSL (قبل از بالا آمدن nginx)

`nginx/nginx.prod.conf` فایل گواهی را از `/etc/letsencrypt/live/<domain>/` می‌خواند، پس تا زمانی که گواهی وجود ندارد کانتینر nginx بالا نمی‌آید (crash loop). بنابراین گواهی را در حالی که پورت ۸۰ آزاد است بگیرید:

```bash
mkdir -p certbot/conf certbot/www
# یک بار با --staging تست کنید، بعد بدون آن اجرا کنید
docker run --rm -p 80:80 \
  -v "$PWD/certbot/conf:/etc/letsencrypt" \
  certbot/certbot certonly --standalone --agree-tos --no-eff-email \
  -m your-email@example.com -d example.com -d www.example.com
ls certbot/conf/live/example.com/   # fullchain.pem privkey.pem
```

همچنین قبل از بالا آمدن، دامنه را در کانفیگ جایگزین کنید (دو `server_name` و دو مسیر `ssl_certificate`):

```bash
sed -i 's/physiquegym\.ir/example.com/g' nginx/nginx.prod.conf
```

### فاز ۴: بررسی کانفیگ nginx (اختیاری - دیگر لازم نیست)

با ترتیب جدید (اول گواهی، بعد `up -d`) نیازی به جابه‌جایی کانفیگ HTTP/HTTPS نیست. بعد از بالا آمدن:

```bash
docker compose -f docker-compose.prod.yml exec nginx nginx -t
docker compose -f docker-compose.prod.yml logs --tail=30 nginx   # نباید ssl_certificate error داشته باشد
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
chmod +x backup_full.sh
crontab -e
# اضافه کنید:
0 2 * * * cd /home/gymuser/gym && ./backup_full.sh >> /home/gymuser/gym/backups/backup.log 2>&1
30 3 * * 0 cd /home/gymuser/gym && docker compose -f docker-compose.prod.yml exec -T nginx nginx -s reload >> /home/gymuser/gym/backups/nginx_reload.log 2>&1
```

> دستور `purge_trash` در این پروژه وجود ندارد؛ خط قبلی هر شب شکست می‌خورد و حذف شده است.
> حذف نهایی ورزشکار از سطل زباله از طریق API انجام می‌شود: `POST /api/athletes/{id}/purge/`.
> ریلود هفتگی nginx برای سوار شدن گواهی تازه‌تمدیدشده لازم است (کانتینر certbot خودش nginx ندارد).

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
cd /home/gymuser/gym
docker compose -f docker-compose.prod.yml stop backend
zcat backups/gym_db_YYYYMMDD_HHMMSS.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
docker compose -f docker-compose.prod.yml start backend
```

**بازیابی media:** (نام والیوم به نام پوشه پروژه وابسته است، پس اول آن را پیدا کنید)
```bash
docker volume ls --filter name=media_data_prod
docker run --rm -v gym_media_data_prod:/data -v /home/gymuser/gym/backups:/backup alpine \
  sh -c "cd /data && rm -rf ./* && tar -xzf /backup/gym_media_YYYYMMDD_HHMMSS.tar.gz -C /data"
```

### تایید تمدید SSL
```bash
docker compose -f docker-compose.prod.yml run --rm certbot renew --dry-run
# بررسی لاگ
docker compose -f docker-compose.prod.yml logs certbot
```

## چک‌لیست نهایی اولین استقرار (حداکثر ۱۵ دستور)
1. `ssh gymuser@SERVER_IP`
2. `cd ~/gym && cp .env.example.prod .env && nano .env && chmod 600 .env`
3. `mkdir -p certbot/conf certbot/www backups && sed -i 's/physiquegym\.ir/example.com/g' nginx/nginx.prod.conf`
4. `docker run --rm -p 80:80 -v "$PWD/certbot/conf:/etc/letsencrypt" certbot/certbot certonly --standalone -d example.com -d www.example.com --agree-tos --no-eff-email -m EMAIL`
5. `docker compose -f docker-compose.prod.yml build`
6. `docker compose -f docker-compose.prod.yml up -d`
7. `docker compose -f docker-compose.prod.yml ps`
8. `docker compose -f docker-compose.prod.yml exec backend python manage.py seed_exercises`
9. `docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser`
10. `docker compose -f docker-compose.prod.yml exec backend python manage.py shell -c "from django.contrib.auth import get_user_model as u; u().objects.filter(username='ADMIN').update(role='admin', is_approved=True)"`
11. `curl -I https://example.com`
12. `docker compose -f docker-compose.prod.yml run --rm certbot renew --dry-run`
13. `chmod +x backup_full.sh && crontab -e` (اضافه کردن ۲ cron فاز ۷)
14. `ssh gymuser@SERVER_IP` در ترمینال دوم برای تایید - بعد غیرفعال کردن پسورد SSH
15. یک برنامه بسازید و PDF را دانلود کنید (تست فونت فارسی)

> نسخهٔ کامل و به‌روز این مراحل در `docs/DEPLOYMENT.md` است.
