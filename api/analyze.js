export default async function handler(req, res) {
  // Pouze POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API klíč není nastaven' });
  }

  try {
    const { base64, mime } = req.body;
    if (!base64 || !mime) {
      return res.status(400).json({ error: 'Chybí base64 nebo mime' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mime, data: base64 } },
            { type: 'text', text: `Na obrázku je SMS zpráva s eReceptem.

Najdi 12místný alfanumerický kód eReceptu (písmena A-Z a číslice 0-9).
Může být zapsán s mezerami (např. "PO4V M7IW G9LB") nebo bez (PO4VM7IWG9LB).
Může být také v URL jako parametr "i=" (např. i=PO4VM7IWG9LB).
Také najdi datum platnosti (dd.mm.yyyy za "platný do" nebo URL parametr "s=").

Odpověz POUZE jako JSON bez markdown:
{"code":"PO4VM7IWG9LB","validity":"25.12.2025"}

Pokud kód nenajdeš, vrať: {"code":null,"validity":null}` }
          ]
        }]
      })
    });

    const data = await response.json();
    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const raw = data.content?.find(b => b.type === 'text')?.text?.trim() || '{}';
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
