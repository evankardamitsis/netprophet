-- The rule cards of the daily quiz: fourteen after the second board, each one answerable and none twice.
begin;
select plan(5);

select is((select count(*)::int from core.quiz_templates where trigger = 'rule' and active), 14, 'fourteen rule cards');
select is((select count(*) - count(distinct slot_template ->> 'q') from core.quiz_templates where trigger = 'rule'), 0::bigint, 'none twice');
select is((select count(*)::int from core.quiz_templates
            where trigger = 'rule' and (family <> 'd' or jsonb_array_length(option_templates) <> 2
                                        or (slot_template ->> 'right')::int not in (0, 1)
                                        or coalesce(slot_template ->> 'reveal', '') = '')), 0,
          'each has two answers, a right one and the line after it');
select ok((select count(*) filter (where (slot_template ->> 'right')::int = 0) between 4 and 10
             from core.quiz_templates where trigger = 'rule'), 'the right answer is not always first');
select is((select option_templates ->> ((slot_template ->> 'right')::int) from core.quiz_templates
            where slot_template ->> 'q' = 'Η μπάλα πήγαινε σίγουρα άουτ και την έπιασες στον αέρα.'),
          'Χάνεις τον πόντο', 'a ball caught in the air loses the point, wherever it was going');

select * from finish();
rollback;
