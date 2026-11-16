// The Journal (newsletter) is paused — there is no newsletter for now.
// /journal redirects to the home page. The previous landing page is in git
// history (commit a6bc2cd and earlier) if the newsletter is ever relaunched.
// The newsletter backend (/api/journal/subscribe, /api/newsletter, /unsubscribe)
// is left in place so existing unsubscribe links keep working.
import { redirect } from 'next/navigation';

export default function JournalPage() {
  redirect('/');
}
