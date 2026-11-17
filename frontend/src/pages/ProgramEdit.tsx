import { useParams } from 'react-router-dom'
import Card from '../components/Card'

export default function ProgramEdit() {
  const { id } = useParams()
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">ویرایش برنامه #{id}</h2>
      <Card>
        <p className="text-[#d1d5db]">صفحهٔ ویرایش برنامه در حال توسعه است.</p>
      </Card>
    </div>
  )
}
