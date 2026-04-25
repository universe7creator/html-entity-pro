module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-License-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { action, text, mode = 'all' } = req.body;

    if (!action || !text) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['action', 'text'],
        example: { action: 'encode', text: '<script>alert("xss")</script>', mode: 'all' }
      });
    }

    if (!['encode', 'decode'].includes(action)) {
      return res.status(400).json({
        error: 'Invalid action',
        valid_actions: ['encode', 'decode']
      });
    }

    let result;
    let stats = {};

    if (action === 'encode') {
      // HTML Entity Encoding
      if (mode === 'all' || mode === 'basic') {
        result = text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
      } else if (mode === 'minimal') {
        // Only encode <, >, &
        result = text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      } else if (mode === 'non_ascii') {
        // Encode all non-ASCII characters
        result = text.replace(/[\u0080-\uFFFF]/g, char => {
          return '&#' + char.charCodeAt(0) + ';';
        });
      }

      stats = {
        original_length: text.length,
        encoded_length: result.length,
        characters_encoded: result.length - text.length,
        mode: mode
      };
    } else {
      // HTML Entity Decoding
      result = text
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&apos;/gi, "'")
        .replace(/&amp;/gi, '&')
        .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
        .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));

      stats = {
        encoded_length: text.length,
        decoded_length: result.length,
        characters_decoded: result.length - text.length,
        mode: mode
      };
    }

    return res.status(200).json({
      success: true,
      action: action,
      mode: mode,
      result: result,
      stats: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Processing failed',
      message: error.message
    });
  }
};
