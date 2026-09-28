// lib/transliterate.js

/**
 * Checks if a string contains any Devanagari (Hindi) script characters.
 */
export function hasDevanagari(text) {
  if (!text || typeof text !== 'string') return false;
  return /[\u0900-\u097F]/.test(text);
}

/**
 * Deterministic Hindi (Devanagari) to modern colloquial Hinglish (Roman script) transliterator.
 * Guarantees that Hindi captions are rendered in natural Roman script for YouTube/Reels subtitles,
 * even if external AI APIs rate-limit or fail.
 */
export function devanagariToHinglish(text) {
  if (!text || typeof text !== 'string') return '';

  const wordOverrides = {
    'शो': 'show', 'रेडी': 'ready', 'बिगिन': 'begin', 'स्टार्ट': 'start', 'वीडियो': 'video',
    'द': 'the', 'टू': 'to', 'मी': 'me', 'लेट': 'let', 'अगेन': 'again', 'मनी': 'money',
    'फॉलोस': 'follows', 'माय': 'my', 'ब्रदर': 'brother', 'लाइफ': 'life', 'टोटल': 'total',
    'प्रोटीन': 'protein', 'फॉलोवर': 'follower', 'फॉलोअर्स': 'followers', 'अंडर': 'under',
    'रेटेड': 'rated', 'कमेंट': 'comment', 'प्रोफाइल': 'profile', 'फीमेल': 'female',
    'अटेंशन': 'attention', 'डाइट': 'diet', 'फॉलो': 'follow', 'है': 'hai', 'हैं': 'hain',
    'हो': 'ho', 'हूँ': 'hoon', 'हूं': 'hoon', 'था': 'tha', 'थी': 'thi', 'थे': 'the',
    'का': 'ka', 'के': 'ke', 'की': 'ki', 'को': 'ko', 'से': 'se', 'में': 'mein', 'पर': 'par',
    'ने': 'ne', 'और': 'aur', 'तो': 'toh', 'भी': 'bhi', 'नहीं': 'nahi', 'ना': 'na',
    'हाँ': 'haan', 'हां': 'haan', 'क्या': 'kya', 'क्यों': 'kyun', 'क्यो': 'kyun',
    'कैसे': 'kaise', 'कहाँ': 'kahan', 'कहा': 'kaha', 'जब': 'jab', 'तब': 'tab', 'अब': 'ab',
    'सब': 'sab', 'ये': 'yeh', 'यह': 'yeh', 'वो': 'woh', 'वह': 'woh', 'वहाँ': 'wahan',
    'यहाँ': 'yahan', 'आप': 'aap', 'तुम': 'tum', 'हम': 'hum', 'मैं': 'main', 'मेरा': 'mera',
    'मेरी': 'meri', 'मेरे': 'mere', 'तेरा': 'tera', 'तेरी': 'teri', 'तेरे': 'tere',
    'उनका': 'unka', 'उनकी': 'unki', 'उनके': 'unke', 'इसका': 'iska', 'इसकी': 'iski',
    'इसके': 'iske', 'अच्छा': 'achha', 'बहुत': 'bohot', 'थोड़ा': 'thoda', 'ज्यादा': 'zyada',
    'लोग': 'log', 'बात': 'baat', 'काम': 'kaam', 'यार': 'yaar', 'सर': 'sir', 'भैया': 'bhaiya',
    'भाई': 'bhai', 'दोस्त': 'dost', 'सकते': 'sakte', 'सकती': 'sakti', 'सकता': 'sakta',
    'करते': 'karte', 'करती': 'karti', 'करता': 'karta', 'होते': 'hote', 'होती': 'hoti',
    'होता': 'hota', 'अपनी': 'apni', 'अपने': 'apne', 'अपना': 'apna', 'कंज्यूम': 'consume',
    'किया': 'kiya', 'किये': 'kiye', 'दी': 'di', 'दिया': 'diya', 'दिए': 'diye',
    'बोल': 'bol', 'बोला': 'bola', 'बोली': 'boli', 'बोले': 'bole', 'देख': 'dekh',
    'देखा': 'dekha', 'देखी': 'dekhi', 'देखे': 'dekhe', 'सुना': 'suna', 'सुनी': 'suni',
    'जाएगा': 'jaayega', 'जाएगी': 'jaayegi', 'जाएंगे': 'jaayenge', 'आएगा': 'aayega',
    'आएगी': 'aayegi', 'आएंगे': 'aayenge', 'रहा': 'raha', 'रही': 'rahi', 'रहे': 'rahe',
    'कौन': 'kaun', 'कोई': 'koi', 'कुछ': 'kuch', 'सिर्फ': 'sirf', 'बस': 'bas', 'सही': 'sahi',
    'गलत': 'galat', 'सच': 'sach', 'झूठ': 'jhooth', 'समय': 'samay', 'वक्त': 'waqt',
    'आज': 'aaj', 'कल': 'kal', 'पर्सों': 'parson', 'पहले': 'pehle', 'बाद': 'baad',
    'घर': 'ghar', 'गाड़ी': 'gaadi', 'पैसा': 'paisa', 'पैसे': 'paise', 'बड़ा': 'bada',
    'बड़ी': 'badi', 'बड़े': 'bade', 'छोटा': 'chhota', 'छोटी': 'chhoti', 'छोटे': 'chhote'
  };

  let cleaned = text
    .replace(/\[\s*(हंसी|हँसी)\s*\]/gi, '[laughter]')
    .replace(/\[\s*(हौसला बढ़ाने की आवाज़|प्रशंसा|तालियां|ताली|चीखने की आवाज)\s*\]/gi, '[applause]')
    .replace(/\[\s*(संगीत|म्यूजिक)\s*\]/gi, '[music]');

  const tokens = cleaned.split(/([ \t\n.,!?;:\"()\[\]]+)/);

  const consonants = {
    '\u0915': 'k', '\u0916': 'kh', '\u0917': 'g', '\u0918': 'gh', '\u0919': 'ng',
    '\u091A': 'ch', '\u091B': 'chh', '\u091C': 'j', '\u091D': 'jh', '\u091E': 'ny',
    '\u091F': 't', '\u0920': 'th', '\u0921': 'd', '\u0922': 'dh', '\u0923': 'n',
    '\u0924': 't', '\u0925': 'th', '\u0926': 'd', '\u0927': 'dh', '\u0928': 'n',
    '\u092A': 'p', '\u092B': 'f', '\u092C': 'b', '\u092D': 'bh', '\u092E': 'm',
    '\u092F': 'y', '\u0930': 'r', '\u0932': 'l', '\u0935': 'v',
    '\u0936': 'sh', '\u0937': 'sh', '\u0938': 's', '\u0939': 'h',
    '\u0958': 'q', '\u0959': 'kh', '\u095A': 'gh', '\u095B': 'z', '\u095C': 'r', '\u095D': 'rh', '\u095E': 'f', '\u095F': 'y'
  };

  const vowels = {
    '\u0905': 'a', '\u0906': 'aa', '\u0907': 'i', '\u0908': 'ee', '\u0909': 'u', '\u090A': 'oo',
    '\u090B': 'ri', '\u090F': 'e', '\u0910': 'ai', '\u0913': 'o', '\u0914': 'au'
  };

  const matras = {
    '\u093E': 'a', '\u093F': 'i', '\u0940': 'ee', '\u0941': 'u', '\u0942': 'oo',
    '\u0943': 'ri', '\u0947': 'e', '\u0948': 'ai', '\u094B': 'o', '\u094C': 'au'
  };

  const virama = '\u094D';
  const anusvara = '\u0902';
  const candrabindu = '\u0901';
  const nukta = '\u093C';

  return tokens.map((token) => {
    if (!token || !/[\u0900-\u097F]/.test(token)) return token;

    const trimmed = token.trim();
    if (wordOverrides[trimmed]) return wordOverrides[trimmed];

    let result = '';
    const len = token.length;

    for (let i = 0; i < len; i++) {
      let char = token[i];
      let nextChar = (i + 1 < len) ? token[i + 1] : '';

      if (nextChar === nukta) {
        if (char === '\u0915') { char = '\u0958'; i++; }
        else if (char === '\u0916') { char = '\u0959'; i++; }
        else if (char === '\u0917') { char = '\u095A'; i++; }
        else if (char === '\u091C') { char = '\u095B'; i++; }
        else if (char === '\u0921') { char = '\u095C'; i++; }
        else if (char === '\u0922') { char = '\u095D'; i++; }
        else if (char === '\u092B') { char = '\u095E'; i++; }
        nextChar = (i + 1 < len) ? token[i + 1] : '';
      }

      if (vowels[char]) {
        result += vowels[char];
      } else if (consonants[char]) {
        result += consonants[char];
        if (matras[nextChar]) {
          result += matras[nextChar];
          i++;
        } else if (nextChar === virama) {
          i++;
        } else if (nextChar === anusvara || nextChar === candrabindu) {
          result += 'an';
          i++;
        } else if (consonants[nextChar] || vowels[nextChar]) {
          result += 'a';
        }
      } else if (matras[char]) {
        result += matras[char];
      } else if (char === anusvara || char === candrabindu) {
        result += 'n';
      } else if (char === '।') {
        result += '.';
      } else {
        result += char;
      }
    }
    return result;
  }).join('');
}

/**
 * Converts an entire transcript array to Roman script Hinglish if it contains Hindi.
 */
export function transliterateTranscript(transcript) {
  if (!Array.isArray(transcript)) return [];
  return transcript.map(seg => ({
    ...seg,
    text: devanagariToHinglish(seg.text || '')
  }));
}
