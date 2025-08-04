import 'server-only';

// Import dictionaries directly
const en = require('../dictionaries/en.json');
const el = require('../dictionaries/el.json');

const dictionaries = {
  en,
  el,
};

export const getDictionary = (locale: 'en' | 'el') => {
  console.log('🔍 Getting dictionary for locale:', locale);
  const dict = dictionaries[locale];
  console.log('📚 Retrieved dictionary:', dict);
  return dict;
}; 