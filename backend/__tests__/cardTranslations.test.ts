/**
 * Unit tests for card translation utilities.
 */
import { getRussianCardName, getCardImagePath, cardNameTranslations } from '../src/utils/cardTranslations';

describe('getRussianCardName', () => {
  it('translates all 22 Major Arcana cards', () => {
    const translations: [string, string][] = [
      ['The Fool', 'Шут'],
      ['The Magician', 'Маг'],
      ['The High Priestess', 'Жрица'],
      ['The Empress', 'Императрица'],
      ['The Emperor', 'Император'],
      ['The Hierophant', 'Иерофант'],
      ['The Lovers', 'Влюбленные'],
      ['The Chariot', 'Колесница'],
      ['Strength', 'Сила'],
      ['The Hermit', 'Отшельник'],
      ['Wheel of Fortune', 'Колесо Фортуны'],
      ['Justice', 'Справедливость'],
      ['The Hanged Man', 'Повешенный'],
      ['Death', 'Смерть'],
      ['Temperance', 'Умеренность'],
      ['The Devil', 'Дьявол'],
      ['The Tower', 'Башня'],
      ['The Star', 'Звезда'],
      ['The Moon', 'Луна'],
      ['The Sun', 'Солнце'],
      ['Judgement', 'Суд'],
      ['The World', 'Мир'],
    ];

    for (const [english, russian] of translations) {
      expect(getRussianCardName(english)).toBe(russian);
    }
  });

  it('returns original name for unknown cards', () => {
    expect(getRussianCardName('Unknown Card')).toBe('Unknown Card');
    expect(getRussianCardName('')).toBe('');
  });

  it('has exactly 22 translations', () => {
    expect(Object.keys(cardNameTranslations)).toHaveLength(22);
  });
});

describe('getCardImagePath', () => {
  it('returns correct path for known cards', () => {
    expect(getCardImagePath('The Fool', false)).toBe('/images/rider-waite-tarot/major_arcana_fool.png');
    expect(getCardImagePath('The Magician', false)).toBe('/images/rider-waite-tarot/major_arcana_magician.png');
    expect(getCardImagePath('Wheel of Fortune', false)).toBe('/images/rider-waite-tarot/major_arcana_fortune.png');
    expect(getCardImagePath('The Hanged Man', false)).toBe('/images/rider-waite-tarot/major_arcana_hanged.png');
  });

  it('returns same path for reversed cards (no separate reversed images)', () => {
    const upright = getCardImagePath('The Fool', false);
    const reversed = getCardImagePath('The Fool', true);
    expect(upright).toBe(reversed);
  });

  it('generates a fallback path for unknown cards', () => {
    const path = getCardImagePath('Some Unknown Card', false);
    expect(path).toBe('/images/rider-waite-tarot/major_arcana_some_unknown_card.png');
  });

  it('defaults isReversed to false', () => {
    const path = getCardImagePath('Death');
    expect(path).toBe('/images/rider-waite-tarot/major_arcana_death.png');
  });
});
