import { useState } from 'react';
import { shuffleWithSeed, renderDatasets, parseChoices } from '../utils';

export default function QuestionCard({ question, index, seed, onAnswer, submitted, chosenKey }) {
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
      <div
        style={{
          background: isCorrect ? '#f0faf4' : isWrong ? '#fff5f5' : '#fff',
          border: '1px solid #c8d8f0', borderRadius: 10, padding: '22px 24px',
          marginBottom: 14, transition: 'box-shadow .2s',
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
          const showCorrect = submitted && c.displayKey === correctKey;
          const showWrong = submitted && selected && c.displayKey !== correctKey;
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
      {submitted && (
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
    </div>
  );
}
