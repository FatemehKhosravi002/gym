import { Link } from 'react-router-dom'
import Card from '../components/Card'
import Button from '../components/Button'

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">داشبورد</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-semibold mb-2 text-gray-900">ورزشکاران</h3>
          <p className="text-sm text-gray-600 mb-4">جستجو و مدیریت ورزشکاران</p>
          <Link to="/athletes">
            <Button variant="primary">مشاهده ورزشکاران</Button>
          </Link>
        </Card>
        <Card>
          <h3 className="font-semibold mb-2 text-gray-900">کتابخانه حرکات</h3>
          <p className="text-sm text-gray-600 mb-4">مدیریت دسته‌بندی و حرکات</p>
          <Link to="/library">
            <Button variant="secondary">مدیریت کتابخانه</Button>
          </Link>
        </Card>
      </div>
    </div>
  )
}
