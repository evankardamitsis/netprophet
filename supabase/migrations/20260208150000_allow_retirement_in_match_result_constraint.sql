-- Allow retirement suffix in match_result (e.g. "2-0 ret", "2-1 ret")
-- so valid_match_result accepts both "2-0" and "2-0 ret" style values.

-- Drop existing constraint(s) on match_result (explicit or system-generated name)
ALTER TABLE public.match_results DROP CONSTRAINT IF EXISTS valid_match_result;
ALTER TABLE public.match_results DROP CONSTRAINT IF EXISTS match_results_match_result_check;

-- Add new constraint: N-N or N-N ret (case-insensitive, optional trailing space)
ALTER TABLE public.match_results
ADD CONSTRAINT valid_match_result CHECK (
    match_result ~* '^[0-9]-[0-9](\s+ret)?\s*$'
);

COMMENT ON COLUMN public.match_results.match_result IS 'Set score (e.g. 2-0, 2-1). Optional suffix " ret" for retirement (e.g. 2-0 ret).';
