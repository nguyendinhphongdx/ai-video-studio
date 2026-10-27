import { redirect } from 'next/navigation';

/** Review moved into the Video screen as a filter; old links and shortcuts still land there. */
export default function ReviewPage() {
  redirect('/library?filter=review');
}
