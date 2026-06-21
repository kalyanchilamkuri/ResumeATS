/**
 * textUtils.js
 * NLP utility functions built on the 'natural' and 'string-similarity' packages.
 * Provides stemming, tokenization, stopword removal, n-gram extraction,
 * fuzzy matching, and text normalization for the scoring pipeline.
 */

const natural = require('natural');
const stringSimilarity = require('string-similarity');
const { STOPWORDS } = require('./constants');

// Porter stemmer for English — deterministic, fast, and widely used in IR
const stemmer = natural.PorterStemmer;

// Word tokenizer that handles punctuation correctly
const wordTokenizer = new natural.WordTokenizer();

/**
 * Returns the Porter stem of a single word.
 * @param {string} word - Input word
 * @returns {string} Stemmed form
 */
function stem(word) {
  if (!word || typeof word !== 'string') return '';
  return stemmer.stem(word.toLowerCase());
}

/**
 * Splits text into word tokens, lowercased, non-empty.
 * @param {string} text - Raw text input
 * @returns {string[]} Array of lowercase word tokens
 */
function tokenize(text) {
  if (!text || typeof text !== 'string') return [];
  // Tokenize and lowercase
  return wordTokenizer.tokenize(text.toLowerCase()).filter(t => t.length > 0);
}

/**
 * Filters out stopwords from a token array.
 * @param {string[]} tokens - Array of lowercase tokens
 * @returns {string[]} Tokens with stopwords removed
 */
function removeStopwords(tokens) {
  if (!Array.isArray(tokens)) return [];
  return tokens.filter(token => !STOPWORDS.has(token) && token.length > 1);
}

/**
 * Generates n-grams from a token array, joined with spaces.
 * @param {string[]} tokens - Array of tokens
 * @param {number} n - Size of each n-gram (2 for bigrams, 3 for trigrams, etc.)
 * @returns {string[]} Array of n-gram strings
 */
function extractNgrams(tokens, n) {
  if (!Array.isArray(tokens) || tokens.length < n || n < 1) return [];
  const ngrams = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n).join(' '));
  }
  return ngrams;
}

/**
 * Finds the best fuzzy match for a term among a list of candidates.
 * Uses Dice coefficient via string-similarity.
 * @param {string} term - The term to search for
 * @param {string[]} candidates - Array of candidate strings
 * @param {number} threshold - Minimum similarity score (0–1), default 0.75
 * @returns {{ target: string, rating: number } | null} Best match or null
 */
function fuzzyMatch(term, candidates, threshold = 0.75) {
  if (!term || !Array.isArray(candidates) || candidates.length === 0) return null;

  // string-similarity requires non-empty strings
  const validCandidates = candidates.filter(c => c && c.length > 0);
  if (validCandidates.length === 0) return null;

  const result = stringSimilarity.findBestMatch(term.toLowerCase(), validCandidates);
  if (result.bestMatch && result.bestMatch.rating >= threshold) {
    return {
      target: result.bestMatch.target,
      rating: result.bestMatch.rating
    };
  }
  return null;
}

/**
 * Normalizes text: lowercase, remove punctuation, trim whitespace.
 * @param {string} text - Raw text
 * @returns {string} Cleaned text
 */
function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s\-\/\+\#\.]/g, ' ')  // Keep word chars, hyphens, slashes, +, #, dots
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = {
  stem,
  tokenize,
  removeStopwords,
  extractNgrams,
  fuzzyMatch,
  normalizeText
};
