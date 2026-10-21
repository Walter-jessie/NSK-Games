import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const questionsDir = path.join(__dirname, '../src/data/questions');

const files = fs.readdirSync(questionsDir).filter(f => f.endsWith('.json'));
const csvRows = ['id,department,category,difficulty,question,option_a,option_b,option_c,option_d,correct,explanation'];

for (const file of files) {
  const content = JSON.parse(fs.readFileSync(path.join(questionsDir, file), 'utf8'));
  const dept = content.department_id || file.replace('.json', '');
  for (const q of content.questions || []) {
    const esc = (txt) => `"${String(txt || '').replace(/"/g, '""')}"`;
    csvRows.push([
      esc(q.id),
      esc(dept),
      esc(q.category),
      esc(q.difficulty || 'medium'),
      esc(q.question),
      esc(q.options?.A),
      esc(q.options?.B),
      esc(q.options?.C),
      esc(q.options?.D),
      esc(q.correct),
      esc(q.explanation)
    ].join(','));
  }
}

fs.writeFileSync(path.join(questionsDir, 'nsk_question_bank.csv'), csvRows.join('\n'), 'utf8');
console.log(`Generated nsk_question_bank.csv with ${csvRows.length - 1} questions.`);
