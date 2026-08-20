import { useState } from 'react';
import { shuffleWithSeed, renderDatasets, parseChoices } from '../utils';

export default function QuestionCard({ question, index, seed, onAnswer, submitted, chosenKey, showAnswers }) {
  const qType = question.type || 'multiple_choice';
  const [blankInput, setBlankInput] = useState(chosenKey || '');

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
          background: isCorrect ? '#f0faf4' : isWrong ? '#fff5f5' : '#fff',
          border: '1px solid #c8d8f0', borderRadius: 10, marginBottom: 14, transition: 'box-shadow .2s',
          borderLeft: !submitted
            ? (chosenKey !== undefined && String(chosenKey).trim() !== '' ? '3px solid #1a4fad' : '1px solid #c8d8f0')
            : (isCorrect ? '3px solid #1a7a4a' : '3px solid #c0392b'),
        }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#5a7090', marginBottom: 8 }}>
          Question {index + 1}
        </div>
        <div style={{ fontSize: 14.5, lineHeight: 1.6, marginBottom: 16 }}
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
              fontFamily: 'inherit', border: `2px solid ${isCorrect ? '#1a7a4a' : isWrong ? '#c0392b' : '#c8d8f0'}`,
              background: submitted ? (isCorrect ? '#d4f5e2' : isWrong ? '#ffe0e0' : '#f5f8ff') : '#fff',
              outline: 'none', color: '#1a2a3a', boxSizing: 'border-box',
            }} />
          {submitted && (
            <div style={{
              fontSize: 12, color: submitted ? (isCorrect ? '#1a7a4a' : '#c0392b') : '#5a7090',
              marginTop: 4, fontWeight: 500,
            }}>
              {!chosenKey ? 'Not answered. ' : isCorrect ? '✓ Correct! ' : '✗ Incorrect. '}
              {showAnswers && !isCorrect && (
                <span style={{ color: '#1a4fad', fontWeight: 400 }}>
                  Correct answer: <strong>{question.answer}</strong>
                </span>
              )}
            </div>
          )}
        </div>
        {submitted && question.explain && (
          <div style={{
            marginTop: 12, fontSize: 13, padding: '8px 14px', borderRadius: 6,
            background: isCorrect ? '#d4f5e2' : '#ffe0e0',
            color: isCorrect ? '#1a7a4a' : '#c0392b',
            lineHeight: 1.5,
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
          background: isCorrect ? '#f0faf4' : isWrong ? '#fff5f5' : '#fff',
          border: '1px solid #c8d8f0', borderRadius: 10, marginBottom: 14, transition: 'box-shadow .2s',
          borderLeft: answered ? '3px solid #1a4fad' : isCorrect ? '3px solid #1a7a4a' : isWrong ? '3px solid #c0392b' : '1px solid #c8d8f0',
        }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#5a7090', marginBottom: 8 }}>
        Question {index + 1}
      </div>
      <div style={{ fontSize: 14.5, lineHeight: 1.6, marginBottom: 16 }}
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
                border: `1px solid ${showCorrect ? '#1a7a4a' : showWrong ? '#c0392b' : selected ? '#1a4fad' : '#c8d8f0'}`,
                borderRadius: 7, cursor: submitted ? 'default' : 'pointer',
                fontSize: 14, userSelect: 'none',
                background: showCorrect ? '#d4f5e2' : showWrong ? '#ffe0e0' : selected ? '#ddeeff' : 'transparent',
                fontWeight: selected ? 500 : 400,
              }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 600, color: '#1a4fad', minWidth: 18 }}>
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
          background: isCorrect ? '#d4f5e2' : '#ffe0e0',
          color: isCorrect ? '#1a7a4a' : '#c0392b',
          lineHeight: 1.5,
        }}>
          {isCorrect ? '✓ Correct! ' : chosenKey ? '✗ Incorrect. ' : '✗ Not answered. '}
          {qData.explain || ''}
        </div>
      )}
      {submitted && !showAnswers && (
        <div style={{ marginTop: 12, fontSize: 12, color: '#5a7090', fontStyle: 'italic' }}>
          {chosenKey ? 'Answered' : 'Not answered'}
        </div>
      )}
    </div>
  );
}
