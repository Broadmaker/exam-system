const BASE = 'https://exam-system.sanigkram24.workers.dev/api';

const questions = [
  // ═══ PART 1: Probability & Sample Space (13 items) ═══
  { part: 1, text: 'From 4 red, 6 blue, and 2 green marbles (12 total), the probability of drawing a red marble is ______ (fraction).', answer: '1/3', explain: '4/12 = 1/3' },
  { part: 1, text: 'The probability of rolling a number greater than 4 on a standard die is ______ (fraction).', answer: '1/3', explain: 'Numbers >4: {5,6} → 2/6 = 1/3' },
  { part: 1, text: 'If a deck contains only hearts, the probability of drawing a heart is ______.', answer: '1', explain: 'Every card is a heart, so the event is certain.' },
  { part: 1, text: 'A class has 30 students, 18 are female. The probability that a randomly selected student is male is ______ (fraction).', answer: '2/5', explain: 'Males=12, P=12/30=2/5' },
  { part: 1, text: 'The set of all possible outcomes of an experiment is called the ______.', answer: 'sample space', explain: '' },
  { part: 1, text: 'If P(A) = 0.35, then P(not A) = ______.', answer: '0.65', explain: '1 - 0.35 = 0.65' },
  { part: 1, text: 'Two events that cannot happen at the same time are called ______ events.', answer: 'mutually exclusive', explain: '' },
  { part: 1, text: 'A standard die has ______ possible outcomes.', answer: '6', explain: 'S = {1,2,3,4,5,6}' },
  { part: 1, text: 'A probability of 0 means the event is ______.', answer: 'impossible', explain: '' },
  { part: 1, text: 'P(A or B) = P(A) + P(B) only when A and B are ______ events.', answer: 'mutually exclusive', explain: 'The special addition rule for disjoint events.' },
  { part: 1, text: 'From a standard 52-card deck, the probability of drawing a King is ______ (fraction).', answer: '1/13', explain: '4 Kings out of 52 = 1/13' },
  { part: 1, text: 'An 8-section spinner (1-8) has P(even) = ______ (fraction).', answer: '1/2', explain: 'Evens: {2,4,6,8} → 4/8 = 1/2' },
  { part: 1, text: 'Of 200 students, 90 take Python, 70 take Java, and 40 take both. P(Python or Java) = ______ (fraction).', answer: '3/5', explain: '(90+70-40)/200 = 120/200 = 3/5' },

  // ═══ PART 2: Independent & Dependent Events (10 items) ═══
  { part: 2, text: 'A coin flipped twice. P(two Heads) = ______ (fraction).', answer: '1/4', explain: '1/2 × 1/2 = 1/4' },
  { part: 2, text: 'A bag has 5 red and 3 blue balls (8 total). Two drawn WITHOUT replacement. P(both red) = ______ (fraction).', answer: '5/14', explain: '5/8 × 4/7 = 20/56 = 5/14' },
  { part: 2, text: 'If A and B are independent, P(A)=0.4, P(B)=0.5, then P(A and B)=______.', answer: '0.2', explain: '0.4 × 0.5 = 0.20' },
  { part: 2, text: 'Drawing cards from a deck without replacement involves ______ events.', answer: 'DEPENDENT', explain: 'Each draw changes the deck composition.' },
  { part: 2, text: 'Drawing a card from a deck, returning it, then drawing again — these events are ______ (INDEPENDENT or DEPENDENT).', answer: 'INDEPENDENT', explain: 'Replacement keeps probabilities the same.' },
  { part: 2, text: 'Selecting 2 students from a class to present (no student presents twice) — these events are ______ (INDEPENDENT or DEPENDENT).', answer: 'DEPENDENT', explain: 'The first student is removed from the pool.' },
  { part: 2, text: 'Rolling a red die and a blue die simultaneously — these events are ______ (INDEPENDENT or DEPENDENT).', answer: 'INDEPENDENT', explain: 'One outcome has no effect on the other.' },
  { part: 2, text: 'Choosing a 4-digit PIN where no digit repeats — these events are ______ (INDEPENDENT or DEPENDENT).', answer: 'DEPENDENT', explain: 'Each digit chosen reduces the pool.' },
  { part: 2, text: 'A jar has 6 green and 4 yellow candies (10 total). Two drawn WITHOUT replacement. P(both green) = ______ (fraction).', answer: '1/3', explain: '6/10 × 5/9 = 30/90 = 1/3' },
  { part: 2, text: 'P(Spam)=0.25, P(FREE|Spam)=0.80, P(FREE)=0.20. Then P(Spam|FREE) = ______.', answer: '1.0', explain: '(0.80×0.25)/0.20 = 1.0' },

  // ═══ PART 3: Permutations & Combinations (12 items) ═══
  { part: 3, text: '5! = ______.', answer: '120', explain: '5×4×3×2×1 = 120' },
  { part: 3, text: 'The number of ways 8 runners can finish 1st, 2nd, 3rd is ______.', answer: '336', explain: '8P3 = 8×7×6 = 336' },
  { part: 3, text: 'A committee of 4 chosen from 10 people can be formed in ______ ways.', answer: '210', explain: '10C4 = (10×9×8×7)/(4×3×2×1) = 210' },
  { part: 3, text: 'The combination formula nCr = n! / (r! × (______)!).', answer: 'n-r', explain: 'nCr = n! / (r! × (n-r)!)' },
  { part: 3, text: 'Electing a President, VP, and Secretary from 15 candidates — answer P (Permutation) or C (Combination).', answer: 'P', explain: 'Each role is distinct, so order matters.' },
  { part: 3, text: 'Selecting 5 features for an ML model from 12 available — answer P (Permutation) or C (Combination).', answer: 'C', explain: 'The features form an unordered set.' },
  { part: 3, text: 'Creating a 6-character password from A-Z with no repeats — answer P (Permutation) or C (Combination).', answer: 'P', explain: 'Order changes the password.' },
  { part: 3, text: 'Choosing 3 software testers from a 10-person team — answer P (Permutation) or C (Combination).', answer: 'C', explain: 'No ranking, just a group.' },
  { part: 3, text: 'Arranging 7 different books on a shelf — answer P (Permutation) or C (Combination).', answer: 'P', explain: 'Different orderings count as different arrangements.' },
  { part: 3, text: 'A 4-digit password using different digits 0-9 has ______ unique passwords.', answer: '5040', explain: '10P4 = 10×9×8×7 = 5,040' },
  { part: 3, text: 'Selecting 3 students from 20 for identical research awards — the number of selections is ______.', answer: '1140', explain: '20C3 = (20×19×18)/(3×2×1) = 1,140' },
  { part: 3, text: 'From 6 women and 5 men, a committee of 3 women and 2 men can be formed in ______ ways.', answer: '200', explain: '6C3 × 5C2 = 20 × 10 = 200' },
];

async function main() {
  const examId = 'aaa934f3-7b16-4dac-8743-09cd59236c50';
  console.log('Using exam ID:', examId);

  // Add all questions
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const res = await fetch(BASE + '/exams/' + examId + '/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'fill_blank',
        part: q.part,
        text: q.text,
        choices: [],
        answer: q.answer,
        explain: q.explain,
        sort_order: i,
      }),
    });
    const data = await res.json();
    console.log(`  Q${i + 1}/${questions.length} added`);
  }

  console.log('\nDone! All ' + questions.length + ' questions added.');
  console.log('Take exam: https://exam-system.sanigkram24.workers.dev/?exam=' + examId);
  console.log('Admin:     https://exam-system.sanigkram24.workers.dev/admin?exam=' + examId);
}

main().catch(console.error);
