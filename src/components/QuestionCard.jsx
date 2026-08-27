import { useState, useEffect } from 'react';
import { renderDatasets, parseChoices } from '../utils';
import { CheckCircle, XCircle, HelpCircle } from 'lucide-react';

export default function QuestionCard({ question, index, seed, onAnswer, submitted, chosenKey, showAnswers }) {
  const qType = question.type || 'multiple_choice';
  const [blankInput, setBlankInput] = useState(chosenKey || '');
  useEffect(() => { setBlankInput(chosenKey || ''); }, [chosenKey]);

  if (qType === 'fill_blank') {
    const isCorrect = submitted && chosenKey !== undefined && String(chosenKey).trim().toLowerCase() === String(question.answer || '').trim().toLowerCase();
    const isWrong = submitted && chosenKey !== undefined && !isCorrect;
    const answered = chosenKey !== undefined && String(chosenKey).trim() !== '';

    const handleBlur = () => { if (!submitted) onAnswer(question.id, blankInput.trim()); };
    const handleChange = (e) => {
      const val = e.target.value;
      setBlankInput(val);
      if (!submitted) onAnswer(question.id, val.trim());
    };

    return (
      <div
        className={`group bg-surface border rounded-[14px] p-5 sm:p-6 shadow-card transition-colors ${
          !submitted ? (answered ? 'border-l-[3px] border-l-navy-700 border-border' : 'border-border') : isCorrect ? 'border-l-[3px] border-l-success border-success/20 bg-success-bg/30' : isWrong ? 'border-l-[3px] border-l-danger border-danger/20 bg-danger-bg/30' : 'border-border'
        }`}
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[.1em] uppercase text-faint">
            <span className="w-6 h-6 rounded-full bg-navy-900 text-white flex items-center justify-center text-[11px] font-bold">{index + 1}</span>
            Question {index + 1}
            {question.part && <span className="text-muted">· Part {question.part}</span>}
          </span>
          {submitted ? (
            answered ? (isCorrect ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success"><CheckCircle size={12} /> Correct</span> : <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-danger"><XCircle size={12} /> Incorrect</span>) : <span className="inline-flex items-center gap-1 text-[11px] font-medium text-faint"><HelpCircle size={12} /> Not answered</span>
          ) : answered ? (
            <span className="text-[11px] font-semibold text-navy-700">Answered</span>
          ) : null}
        </div>

        <div className="text-[14.5px] leading-relaxed text-text mb-4" dangerouslySetInnerHTML={{ __html: renderDatasets(question.text, seed, index) }} />

        <input
          value={blankInput}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={submitted}
          placeholder="Type your answer…"
          className={`w-full rounded-xl px-4 py-3 text-[14px] border-2 outline-none transition-colors bg-canvas focus:bg-surface ${
            submitted ? (isCorrect ? 'border-success bg-success-bg/50' : isWrong ? 'border-danger bg-danger-bg/50' : 'border-border') : 'border-border-strong focus:border-navy-700 focus:shadow-[0_0_0_3px_var(--color-navy-100)]'
          }`}
        />

        {submitted && (
          <div className={`mt-3 text-[12px] font-medium flex items-center gap-1.5 ${isCorrect ? 'text-success' : isWrong ? 'text-danger' : 'text-muted'}`}>
            {!chosenKey ? 'Not answered.' : isCorrect ? 'Correct!' : 'Incorrect.'}
            {showAnswers && !isCorrect && (
              <span className="font-normal text-navy-700">
                Correct answer: <strong className="font-semibold">{question.answer}</strong>
              </span>
            )}
          </div>
        )}
        {submitted && question.explain && (
          <div className={`mt-3 text-[13px] leading-relaxed px-3.5 py-2.5 rounded-xl border ${isCorrect ? 'bg-success-bg border-success/20 text-success' : 'bg-danger-bg border-danger/20 text-danger'}`}>
            {question.explain}
          </div>
        )}
      </div>
    );
  }

  const qData = { ...question, choices: parseChoices(question.choices) };
  // Choices are shown in their fixed (DB) order: the display letter IS the choice's
  // canonical key (A=first choice, B=second, …), so the letter and label always align.
  const fixedChoices = qData.choices.map((c) => ({ ...c, displayKey: c.key }));
  const correctKey = qData.answer;

  const handleChange = (displayKey) => { if (!submitted) onAnswer(qData.id, displayKey); };

  const answered = chosenKey !== undefined;
  const isCorrect = submitted && chosenKey === correctKey;
  const isWrong = submitted && chosenKey !== undefined && chosenKey !== correctKey;

  return (
    <div
      className={`bg-surface border rounded-[14px] p-5 sm:p-6 shadow-card transition-colors ${
        answered && !submitted ? 'border-l-[3px] border-l-navy-700 border-border' : isCorrect ? 'border-l-[3px] border-l-success border-success/20 bg-success-bg/30' : isWrong ? 'border-l-[3px] border-l-danger border-danger/20 bg-danger-bg/30' : 'border-border'
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[.1em] uppercase text-faint">
          <span className="w-6 h-6 rounded-full bg-navy-900 text-white flex items-center justify-center text-[11px] font-bold">{index + 1}</span>
          Question {index + 1}
          {qData.part && <span className="text-muted">· Part {qData.part}</span>}
        </span>
        {submitted ? (
          isCorrect ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success"><CheckCircle size={12} /> Correct</span> : answered ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-danger"><XCircle size={12} /> Incorrect</span> : <span className="inline-flex items-center gap-1 text-[11px] font-medium text-faint"><HelpCircle size={12} /> Not answered</span>
        ) : answered ? (
          <span className="text-[11px] font-semibold text-navy-700">Answered</span>
        ) : (
          <span className="text-[11px] text-faint">Unanswered</span>
        )}
      </div>

      <div className="text-[14.5px] leading-relaxed text-text mb-4" dangerouslySetInnerHTML={{ __html: renderDatasets(qData.text, seed, index) }} />

      <div className="flex flex-col gap-2">
        {fixedChoices.map((c) => {
          const selected = chosenKey === c.displayKey;
          const showCorrect = submitted && showAnswers && c.displayKey === correctKey;
          const showWrong = submitted && showAnswers && selected && c.displayKey !== correctKey;
          return (
            <label
              key={c.displayKey}
              onClick={() => handleChange(c.displayKey)}
              className={`group flex items-center gap-3 px-4 py-3 rounded-xl border text-[14px] transition-colors select-none ${
                submitted ? 'cursor-default' : 'cursor-pointer hover:border-navy-700/30'
              } ${
                showCorrect
                  ? 'bg-success-bg border-success text-success font-medium'
                  : showWrong
                  ? 'bg-danger-bg border-danger text-danger font-medium'
                  : selected
                  ? 'bg-navy-100 border-navy-700 text-navy-800 font-medium shadow-sm'
                  : 'bg-surface border-border hover:bg-navy-50'
              }`}
            >
              <span
                className={`w-7 h-7 rounded-full border flex items-center justify-center text-[12px] font-bold shrink-0 transition-colors ${
                  showCorrect ? 'bg-success text-white border-success' : showWrong ? 'bg-danger text-white border-danger' : selected ? 'bg-navy-700 text-white border-navy-700' : 'bg-canvas text-muted border-border group-hover:border-navy-700/40'
                }`}
              >
                {c.displayKey}
              </span>
              <span className="flex-1">{c.text}</span>
              {showCorrect && <CheckCircle size={16} className="text-success shrink-0" />}
              {showWrong && <XCircle size={16} className="text-danger shrink-0" />}
            </label>
          );
        })}
      </div>

      {submitted && showAnswers && (
        <div className={`mt-3 text-[13px] leading-relaxed px-3.5 py-2.5 rounded-xl border ${isCorrect ? 'bg-success-bg border-success/20 text-success' : 'bg-danger-bg border-danger/20 text-danger'}`}>
          {isCorrect ? 'Correct!' : answered ? 'Incorrect.' : 'Not answered.'} {qData.explain ? ` ${qData.explain}` : ''}
        </div>
      )}
      {submitted && !showAnswers && (
        <div className="mt-3 text-[12px] text-muted italic">{answered ? 'Answered' : 'Not answered'}</div>
      )}
    </div>
  );
}
