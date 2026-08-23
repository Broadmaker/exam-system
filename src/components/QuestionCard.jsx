import { useState, useEffect } from 'react';
import { shuffleWithSeed, renderDatasets, parseChoices } from '../utils';

export default function QuestionCard({ question, index, seed, onAnswer, submitted, chosenKey, showAnswers }) {
  const qType = question.type || 'multiple_choice';
  const [blankInput, setBlankInput] = useState(chosenKey || '');
  useEffect(() => { setBlankInput(chosenKey || ''); }, [chosenKey]);

  if (qType === 'fill_blank') {
    const isCorrect = submitted && chosenKey !== undefined &&
      String(chosenKey).trim().toLowerCase() === String(question.answer || '').trim().toLowerCase();
    const isWrong = submitted && chosenKey !== undefined && !isCorrect;

    const handleBlur = () => {
      if (!submitted) onAnswer(question.id, blankInput.trim());
    };
    const handleChange = (e) => {
      const val = e.target.value;
      setBlankInput(val);
      if (!submitted) onAnswer(question.id, val.trim());
    };

    return (
      <div className="exam-question-card"
        style={{
          background: isCorrect ? 'var(--color-success-bg)' : isWrong ? 'var(--color-danger-bg)' : 'var(--color-surface)',
          border: '1px solid var(--color-border)', borderRadius: 10, marginBottom: 14, transition: 'box-shadow .2s',
          color: 'var(--color-text)',
          borderLeft: !submitted
            ? (chosenKey !== undefined && String(chosenKey).trim() !== '' ? '3px solid var(--color-navy-700)' : '1px solid var(--color-border)')
            : (isCorrect ? '3px solid var(--color-success)' : '3px solid var(--color-danger)'),
        }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--color-faint)', marginBottom: 8 }}>
          Question {index + 1}
        </div>
        <div style={{ fontSize: 14.5, lineHeight: 1.6, marginBottom: 16, color: 'var(--color-text)' }}
          dangerouslySetInnerHTML={{ __html: renderDatasets(question.text, seed, index) }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            value={blankInput}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={submitted}
            placeholder="Type your answer..."
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 8, fontSize: 14,
              fontFamily: 'inherit', border: '2px solid ' + (isCorrect ? 'var(--color-success)' : isWrong ? 'var(--color-danger)' : 'var(--color-border-strong)'),
              background: submitted ? (isCorrect ? 'var(--color-success-bg)' : isWrong ? 'var(--color-danger-bg)' : 'var(--color-canvas)') : 'var(--color-surface)',
              outline: 'none', color: 'var(--color-text)', boxSizing: 'border-box',
            }} />
          {submitted && (
            <div style={{
              fontSize: 12, color: isCorrect ? 'var(--color-success)' : isWrong ? 'var(--color-danger)' : 'var(--color-muted)',
              marginTop: 4, fontWeight: 500,
            }}>
              {!chosenKey ? 'Not answered. ' : isCorrect ? '✓ Correct! ' : '✗ Incorrect. '}
              {showAnswers && !isCorrect && (
                <span style={{ color: 'var(--color-navy-700)', fontWeight: 400 }}>
                  Correct answer: <strong>{question.answer}</strong>
                </span>
              )}
            </div>
          )}
        </div>
        {submitted && question.explain && (
          <div style={{
            marginTop: 12, fontSize: 13, padding: '8px 14px', borderRadius: 6,
            background: isCorrect ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
            color: isCorrect ? 'var(--color-success)' : 'var(--color-danger)',
            lineHeight: 1.5, border: '1px solid ' + (isCorrect ? 'var(--color-success)' : 'var(--color-danger)'),
          }}>
            {question.explain}
          </div>
        )}
      </div>
    );
  }

  const qData = { ...question, choices: parseChoices(question.choices) };
  const choiceSeed = seed + index * 7919;
  const shuffled = shuffleWithSeed(qData.choices, choiceSeed).map((c, ci) => ({
    ...c,
    displayKey: String.fromCharCode(65 + ci),
  }));
  const correctKey = shuffled.find((c) => c.key === qData.answer).displayKey;

  const handleChange = (displayKey) => {
    if (!submitted) onAnswer(qData.id, displayKey);
  };

  const answered = chosenKey !== undefined;
  const isCorrect = submitted && chosenKey === correctKey;
  const isWrong = submitted && chosenKey !== undefined && chosenKey !== correctKey;

  return (
      <div className="exam-question-card"
        style={{
          background: isCorrect ? 'var(--color-success-bg)' : isWrong ? 'var(--color-danger-bg)' : 'var(--color-surface)',
          border: '1px solid var(--color-border)', borderRadius: 10, marginBottom: 14, transition: 'box-shadow .2s',
          color: 'var(--color-text)',
          borderLeft: answered && !submitted ? '3px solid var(--color-navy-700)' : isCorrect ? '3px solid var(--color-success)' : isWrong ? '3px solid var(--color-danger)' : '1px solid var(--color-border)',
        }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--color-faint)', marginBottom: 8 }}>
        Question {index + 1}
      </div>
      <div style={{ fontSize: 14.5, lineHeight: 1.6, marginBottom: 16, color: 'var(--color-text)' }}
        dangerouslySetInnerHTML={{ __html: renderDatasets(qData.text, seed, index) }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {shuffled.map((c) => {
          const selected = chosenKey === c.displayKey;
          const showCorrect = submitted && showAnswers && c.displayKey === correctKey;
          const showWrong = submitted && showAnswers && selected && c.displayKey !== correctKey;
          return (
            <label key={c.displayKey} onClick={() => handleChange(c.displayKey)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                border: '1px solid ' + (showCorrect ? 'var(--color-success)' : showWrong ? 'var(--color-danger)' : selected ? 'var(--color-navy-700)' : 'var(--color-border)'),
                borderRadius: 7, cursor: submitted ? 'default' : 'pointer',
                fontSize: 14, userSelect: 'none',
                background: showCorrect ? 'var(--color-success-bg)' : showWrong ? 'var(--color-danger-bg)' : selected ? 'var(--color-navy-100)' : 'transparent',
                fontWeight: selected ? 500 : 400,
                color: 'var(--color-text)',
              }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 600, color: selected || showCorrect ? 'var(--color-navy-700)' : 'var(--color-muted)', minWidth: 18 }}>
                {c.displayKey}
              </span>
              <span>{c.text}</span>
            </label>
          );
        })}
      </div>
      {submitted && showAnswers && (
        <div style={{
          marginTop: 12, fontSize: 13, padding: '8px 14px', borderRadius: 6,
          background: isCorrect ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
          color: isCorrect ? 'var(--color-success)' : 'var(--color-danger)',
          lineHeight: 1.5, border: '1px solid ' + (isCorrect ? 'var(--color-success)' : 'var(--color-danger)'),
        }}>
          {isCorrect ? '✓ Correct! ' : chosenKey ? '✗ Incorrect. ' : '✗ Not answered. '}
          {qData.explain || ''}
        </div>
      )}
      {submitted && !showAnswers && (
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--color-muted)', fontStyle: 'italic' }}>
          {chosenKey ? 'Answered' : 'Not answered'}
        </div>
      )}
    </div>
  );
}
