import { redirect } from 'next/navigation'

export default function SelectedPage({ params }: { params: { locale: string } }) {
  redirect(`/${params.locale}/my-offers`)
}
