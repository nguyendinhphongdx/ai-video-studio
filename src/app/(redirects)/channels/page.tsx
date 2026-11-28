import { redirect } from 'next/navigation';

/** Old path, kept so bookmarks and links keep working. */
export default function Page() {
  redirect('/');
}
