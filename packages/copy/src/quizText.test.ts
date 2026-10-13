import { describe, expect, it } from 'vitest';
import { capitalizeFirst, renderQuizQuestion, renderQuizText } from './quizText';

const nikos = { first_name: 'Νίκος', surname: 'Ροδίτης', gender: 'm' as const };
const ioanna = { first_name: 'Ιωάννα', surname: 'Τσάκου', gender: 'f' as const };
const maria = { first_name: 'Μαρία', surname: 'Καρρά', gender: null };
const players = [nikos, ioanna, maria];

describe('renderQuizText', () => {
    it('fills every token kind', () => {
        expect(renderQuizText('{p1}', players)).toBe('Νίκος Ροδίτης');
        expect(renderQuizText('{p1.first}', players)).toBe('Νίκος');
        expect(renderQuizText('{p1.o}', players)).toBe('ο Νίκος Ροδίτης');
        expect(renderQuizText('{p2.o}', players)).toBe('η Ιωάννα Τσάκου');
        expect(renderQuizText('{p1.o_first}', players)).toBe('ο Νίκος');
        expect(renderQuizText('{p2.o_first}', players)).toBe('η Ιωάννα');
        expect(renderQuizText('{p1.ton}', players)).toBe('τον Νίκο Ροδίτη');
        expect(renderQuizText('{p2.ton}', players)).toBe('την Ιωάννα Τσάκου');
        expect(renderQuizText('{p1.ston}', players)).toBe('στον Νίκο Ροδίτη');
        expect(renderQuizText('{p2.ston}', players)).toBe('στην Ιωάννα Τσάκου');
    });

    it('falls back to the first name when the roster has no gender', () => {
        expect(renderQuizText('{p3.o}', players)).toBe('η Μαρία Καρρά');
        expect(renderQuizText('{p3.ton}', players)).toBe('την Μαρία Καρρά');
    });

    it('renders a whole sentence', () => {
        expect(renderQuizText('{p1.o} σερβίρει για το ματς απέναντι {p2.ston}. Το κλείνει;', players)).toBe(
            'ο Νίκος Ροδίτης σερβίρει για το ματς απέναντι στην Ιωάννα Τσάκου. Το κλείνει;',
        );
        expect(renderQuizText('Της το παίρνει {p1.o_first}', players)).toBe('Της το παίρνει ο Νίκος');
    });

    it('leaves a token for a missing player and plain text alone', () => {
        expect(renderQuizText('{p4.o} και {p1}', players)).toBe('{p4.o} και Νίκος Ροδίτης');
        expect(renderQuizText('Συμφωνώ', players)).toBe('Συμφωνώ');
    });

    it('has no articles in English', () => {
        expect(renderQuizText('{p1.o} vs {p2.ston}', players, 'en')).toBe('Nikos Roditis vs Ioanna Tsakou');
        expect(renderQuizText('{p1.o_first}', players, 'en')).toBe('Nikos');
    });
});

describe('renderQuizQuestion', () => {
    it('capitalises a question that starts with an article', () => {
        expect(renderQuizQuestion('{p1.o} προηγείται 5-2 στο τρίτο σετ.', players)).toBe('Ο Νίκος Ροδίτης προηγείται 5-2 στο τρίτο σετ.');
        expect(renderQuizQuestion('{p2.o} προηγείται.', players)).toBe('Η Ιωάννα Τσάκου προηγείται.');
    });

    it('keeps an accent on the first letter', () => {
        expect(capitalizeFirst('όχι αυτή τη φορά')).toBe('Όχι αυτή τη φορά');
    });
});
