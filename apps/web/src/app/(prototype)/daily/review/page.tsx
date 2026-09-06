import { ReviewShell } from '@/components/daily/review/ReviewShell';

// The daily check-in.
//
// A shell rather than a server-rendered queue: the web app keeps its Supabase
// session in localStorage, so only the browser can produce the access token the
// server actions need. Nothing sensitive is rendered here — the queue arrives
// after the caller has proved they are an admin.

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Daily Run — review',
    robots: { index: false, follow: false },
};

export default function ReviewPage() {
    return <ReviewShell />;
}
