const MAX_INPUT = 4000;

const prompts = {
    chat: 'You are a warm, accurate school study assistant. Reply in the same language as the student (Somali or English). Explain at the student level, use short steps, and never pretend to know private school data. Keep the answer under 220 words.',
    translate: 'Translate the announcement faithfully between Somali and English. Detect the source language and output only the translation. Preserve names, dates, times, phone numbers, and formatting. Use clear language suitable for parents.',
    comment: 'Write one professional report-card comment of 45-70 words. Mention the supplied strength, give one constructive next step, and end encouragingly. Do not invent facts. Output only the comment.',
    admin: 'You are a practical school administration assistant. Draft clear announcements, parent messages, meeting agendas, action plans, and short operational summaries in the language requested by the user (Somali or English). Never invent student records, finances, dates, policies, or private school data. Mark missing details clearly. Keep the response under 350 words.',
};

const fallbackChat = (text) => {
    const q = text.toLowerCase();
    const somali = /\b(maxay|sidee|waa|maxaa|iga|cashar|xisaab|barasho|sharax)\b/.test(q);
    if (/fraction|jajab/.test(q)) return somali ? 'Jajabku waa qayb ka mid ah wax dhan. Tusaale ahaan, 3/4 waxay ka dhigan tahay 3 qaybood oo ka mid ah 4 qaybood oo isle’eg.' : 'A fraction represents part of a whole. For example, 3/4 means three of four equal parts.';
    if (/photosynthesis/.test(q)) return somali ? 'Photosynthesis waa habka dhirtu iftiinka qorraxda, biyaha iyo kaarboon laba ogsaydhka ugu beddesho cunto iyo oksijiin.' : 'Photosynthesis is how plants use sunlight, water, and carbon dioxide to produce glucose and oxygen.';
    return somali ? 'Waxaan kaa caawin karaa casharrada, qorshaha waxbarashada iyo su’aalaha tababarka. Fadlan ii sheeg maadada, fasalka iyo qaybta kugu adag.' : 'I can help with lesson explanations, study plans, and practice questions. Tell me the subject, grade, and the exact part you find difficult.';
};

const englishToSomali = [
    [/dear parents/gi, 'Waalidiinta qaaliga ah'], [/the school will be closed tomorrow/gi, 'dugsigu berri wuu xirnaan doonaa'],
    [/the school will be open tomorrow/gi, 'dugsigu berri wuu furnaan doonaa'], [/thank you/gi, 'Mahadsanidiin'],
    [/please attend the meeting/gi, 'fadlan ka soo qayb gala kulanka'], [/exam/gi, 'imtixaan'], [/homework/gi, 'shaqo-guri'],
];
const somaliToEnglish = [
    [/waalidiinta qaaliga ah/gi, 'Dear parents'], [/dugsigu berri wuu xirnaan doonaa/gi, 'the school will be closed tomorrow'],
    [/dugsigu berri wuu furnaan doonaa/gi, 'the school will be open tomorrow'], [/mahadsanidiin/gi, 'Thank you'],
    [/fadlan ka soo qayb gala kulanka/gi, 'please attend the meeting'], [/imtixaan/gi, 'exam'], [/shaqo-guri/gi, 'homework'],
];
const fallbackTranslate = (text) => {
    const looksSomali = /\b(waalidiinta|dugsigu|berri|mahadsanidiin|fadlan|imtixaan|shaqo-guri)\b/i.test(text);
    return (looksSomali ? somaliToEnglish : englishToSomali).reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), text);
};

async function generateWithOpenAI(mode, input, context) {
    if (!process.env.OPENAI_API_KEY) return null;
    const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({
            model: process.env.OPENAI_MODEL || 'gpt-5.4',
            instructions: prompts[mode],
            input: context ? `${input}\n\nContext supplied by the user:\n${JSON.stringify(context)}` : input,
            max_output_tokens: 500,
            store: false,
        }),
        signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`OpenAI request failed (${response.status})`);
    const data = await response.json();
    return data.output?.flatMap(item => item.content || []).find(part => part.type === 'output_text')?.text?.trim() || null;
}

exports.generate = async (req, res) => {
    const mode = String(req.body.mode || '');
    const input = String(req.body.input || '').trim();
    if (!prompts[mode]) return res.status(400).json({ message: 'Unsupported assistant mode' });
    if (mode === 'admin' && req.user?.role !== 'school-admin') return res.status(403).json({ message: 'Admin helper is restricted to school administrators' });
    if (!input || input.length > MAX_INPUT) return res.status(400).json({ message: `Input must be between 1 and ${MAX_INPUT} characters` });
    const context = req.body.context && typeof req.body.context === 'object' ? req.body.context : null;
    try {
        const result = await generateWithOpenAI(mode, input, context);
        if (result) return res.json({ success: true, data: { text: result, source: 'ai' } });
    } catch (error) {
        console.warn('AI assistant provider unavailable:', error.message);
    }
    let text;
    if (mode === 'translate') text = fallbackTranslate(input);
    else if (mode === 'comment') text = `${context?.name || 'This student'} is making ${context?.level === 'excellent' ? 'excellent' : context?.level === 'developing' ? 'encouraging' : 'steady'} progress and ${context?.strength || 'contributes positively in class'}. The next priority is ${context?.focus || 'developing consistent study habits'}. Continued practice and careful attention will support further growth. Keep up the effort!`;
    else if (mode === 'admin') text = `Qabyo-qoraal maamulka school-ka\n\nUjeeddo: ${input}\n\nTallaabooyinka:\n• Hubi xogta, taariikhda iyo dadka ay khusayso.\n• U qoondee qofka masuulka ah iyo waqtiga kama dambaysta ah.\n• La wadaag fariinta cidda ay khusayso.\n• Diiwaangeli natiijada oo samee dabagal.\n\nFadlan dib u eeg oo ku dar faahfaahinta school-ka ka hor intaadan dirin.`;
    else text = fallbackChat(input);
    return res.json({ success: true, data: { text, source: 'fallback' } });
};
