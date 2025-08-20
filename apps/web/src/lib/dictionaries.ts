import 'server-only';

// Import dictionaries directly
const en = require('../dictionaries/en.json');
const el = require('../dictionaries/el.json');

const dictionaries = {
  en,
  el,
};

export const getDictionary = (locale: 'en' | 'el') => {
  const dict = dictionaries[locale];
  return dict;
}; 