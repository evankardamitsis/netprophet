-- Add INSERT policy for match_results table
CREATE POLICY "Match results insert policy" ON public.match_results
    FOR
INSERT WITH CHECK
    (
    EXISTS (


ELECT
1
FROM public.
HERE id =
(SELECT auth.uid()
)
AND is_admin = true
        )
OR
((SELECT auth.role())
= 'service_role')
    );
