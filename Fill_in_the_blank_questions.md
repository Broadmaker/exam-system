# BSCS — STATISTICS & PROBABILITY
## Basic Probability Concepts — Complete Answer Key

*Every item below has been solved and independently double-checked. Full step-by-step work is shown so students can see exactly how each answer is reached. Two items required a judgment call — flagged with a NOTE box.*

---

## PART 1: Probability & Sample Space (25 pts)

### Section A — Multiple Choice

**1.** *P(drawing a red marble) from 4 red, 6 blue, 2 green.*

> Total marbles = 4 + 6 + 2 = 12.
> P(red) = 4/12 = 1/3.
>
> **Answer: A. 1/3**

**2.** *P(rolling a number greater than 4) on a die.*

> Numbers greater than 4 on a standard die: {5, 6} → 2 outcomes.
> P = 2/6 = 1/3.
>
> **Answer: B. 1/3**

**3.** *Which event has probability equal to 1?*

> A: rolling a 7 is impossible → P = 0.
> C: P(tails) = 1/2.
> D: P(face card) = 12/52 ≈ 0.23.
> B: if every card in the deck is a heart, drawing a heart is certain → P = 1. ✓
>
> **Answer: B. Drawing a heart from a deck of only hearts**

**4.** *Class of 30 students, 18 female. Find P(male).*

> Males = 30 − 18 = 12.
> P(male) = 12/30 = 2/5 (0.40).
>
> **Answer: B. 2/5**

### Section B — Fill in the Blanks

**5.** *The set of all possible outcomes of an experiment is called the ______.*

> **Answer: sample space**

**6.** *If P(A) = 0.35, then P(not A) = ______.*

> P(not A) = 1 − P(A) = 1 − 0.35 = 0.65.
>
> **Answer: 0.65**

**7.** *Two events that cannot happen at the same time are called ______ events.*

> **Answer: mutually exclusive (disjoint)**

**8.** *Sample space for rolling one standard die: S = { ______ }.*

> **Answer: S = {1, 2, 3, 4, 5, 6}**

**9.** *A probability of 0 means the event is ______.*

> **Answer: impossible**

**10.** *P(A or B) = P(A) + P(B) only when A and B are ______ events.*

> This is the special (restricted) addition rule — it only holds when the events share no outcomes.
>
> **Answer: mutually exclusive**

### Section C — Problem Solving

**11.** *Standard 52-card deck, one card drawn. Find (a) P(King), (b) P(Heart), (c) P(King of Hearts).*

> (a) 4 Kings in the deck → P(King) = 4/52 = 1/13.
> (b) 13 Hearts in the deck → P(Heart) = 13/52 = 1/4.
> (c) Only 1 card is the King of Hearts → P(King of Hearts) = 1/52.
>
> **Answer: (a) 1/13 (b) 1/4 (c) 1/52**

**12.** *8-section spinner (1–8). Find (a) P(even), (b) P(<3), (c) P(prime).*

> (a) Evens: {2,4,6,8} → 4/8 = 1/2.
> (b) Less than 3: {1,2} → 2/8 = 1/4.
> (c) Primes in 1–8: {2,3,5,7} → 4/8 = 1/2.
>
> **Answer: (a) 1/2 (b) 1/4 (c) 1/2**

**13.** *200 students: 90 Python, 70 Java, 40 both. Find P(Python or Java) using the General Addition Rule.*

> General Addition Rule: P(A or B) = P(A) + P(B) − P(A and B).
> = 90/200 + 70/200 − 40/200 = 120/200 = 3/5 = 0.60.
>
> **Answer: 3/5 (0.60, or 60%)**

---

## PART 2: Independent & Dependent Events (25 pts)

### Section A — Multiple Choice

**14.** *A coin is flipped twice. P(two Heads)?*

> Flips are independent: P(H) × P(H) = 1/2 × 1/2 = 1/4.
>
> **Answer: A. 1/4**

**15.** *Bag: 5 red, 3 blue (8 total). Two balls drawn WITHOUT replacement. Find P(both red).*

> P(1st red) = 5/8.
> P(2nd red | 1st red) = 4/7 (one red already removed, 7 balls left).
> P(both red) = 5/8 × 4/7 = 20/56 = 5/14 ≈ 0.357.
>
> **Answer: 5/14 (equivalent to 20/56)**

> **NOTE:** Options B (5/14) and C (20/56) are the SAME value — 20/56 is just the unreduced form of 5/14. Both are mathematically correct; B is the fully simplified form, which is the conventional answer to mark, but C should also be accepted as correct since it's numerically identical.

**16.** *A and B independent, P(A)=0.4, P(B)=0.5. Find P(A and B).*

> Independent events: P(A and B) = P(A) × P(B) = 0.4 × 0.5 = 0.20.
>
> **Answer: C. 0.2**

**17.** *Which scenario involves DEPENDENT events?*

> Removing a card changes the composition of the deck for the next draw — the events affect each other.
> A, B, D are all independent (each trial doesn't change the conditions of the next).
>
> **Answer: C. Drawing cards from a deck without replacement**

### Section B — Classify & Explain

**18.** *Drawing a card, returning it, then drawing again.*

> The card is replaced before the second draw, so the deck composition — and therefore the probabilities — stay exactly the same for the second draw.
>
> **Answer: INDEPENDENT**

**19.** *Selecting 2 students from a class to present (no student presents twice).*

> Once the first student is chosen, they're removed from the pool, changing the probabilities for the second selection.
>
> **Answer: DEPENDENT**

**20.** *Rolling a red die and a blue die simultaneously.*

> The outcome of one die has no physical effect on the outcome of the other die.
>
> **Answer: INDEPENDENT**

**21.** *Choosing a 4-digit PIN where no digit repeats.*

> Each digit chosen is removed from the pool of available digits, so the probability for each next digit depends on what was already chosen.
>
> **Answer: DEPENDENT**

### Section C — Problem Solving

**22.** *Jar: 6 green, 4 yellow (10 total). Two candies drawn WITHOUT replacement. Find P(both green).*

> P(1st green) = 6/10.
> P(2nd green | 1st green) = 5/9 (one green removed, 9 candies left).
> P(both green) = 6/10 × 5/9 = 30/90 = 1/3 ≈ 0.333.
>
> **Answer: 1/3**

**23.** *P(Spam)=0.25, P(FREE|Spam)=0.80, P(FREE)=0.20. Find P(Spam|FREE) using conditional probability.*

> Bayes' / conditional formula: P(Spam | FREE) = [P(FREE | Spam) × P(Spam)] / P(FREE).
> = (0.80 × 0.25) / 0.20 = 0.20 / 0.20 = 1.0.
>
> **Answer: 1.0 (100%)**

> **NOTE:** This result (100%) looks extreme, but it follows exactly from the numbers given: since P(FREE|Spam)×P(Spam) already equals the full P(FREE)=0.20, it implies P(FREE|Not Spam)=0 — i.e., in this data, non-spam emails never contain the word FREE. The math is correct given the stated values; it's simply a "clean number" teaching example.

---

## PART 3: Permutations & Combinations (25 pts)

### Section A — Multiple Choice

**24.** *What is 5!?*

> 5! = 5×4×3×2×1 = 120.
>
> **Answer: C. 120**

**25.** *How many ways can 8 runners finish 1st, 2nd, 3rd?*

> Order matters (positions are distinct) → permutation.
> 8P3 = 8!/(8−3)! = 8×7×6 = 336.
>
> **Answer: B. 8P3 = 336**

**26.** *Committee of 4 chosen from 10 people — how many ways?*

> Order doesn't matter for a committee → combination.
> 10C4 = 10!/(4!×6!) = (10×9×8×7)/(4×3×2×1) = 5040/24 = 210.
>
> **Answer: B. 10C4 = 210**

**27.** *Which formula correctly defines nCr?*

> This is the standard combination formula (accounts for the r! ways the chosen group could be ordered, dividing them out since order doesn't matter).
>
> **Answer: C. n! / (r! × (n−r)!)**

### Section B — Permutation or Combination?

**28.** *Electing a President, VP, and Secretary from 15 candidates.*

> Each role is distinct — who becomes President vs. Secretary matters, so order/position matters.
>
> **Answer: P (Permutation)**

**29.** *Selecting 5 features for an ML model from 12 available features.*

> The 5 chosen features form an unordered set — which one was picked "first" doesn't matter.
>
> **Answer: C (Combination)**

**30.** *Creating a 6-character password from A–Z with no repeated letters.*

> Changing the order of the same 6 letters creates a completely different password — order matters.
>
> **Answer: P (Permutation)**

**31.** *Choosing 3 software testers from a 10-person team.*

> The 3 testers are just a group — no ranking or distinct role is assigned, so order doesn't matter.
>
> **Answer: C (Combination)**

**32.** *Arranging 7 different books on a shelf.*

> Different left-to-right orderings of the same 7 books count as different arrangements — order matters.
>
> **Answer: P (Permutation)**

### Section C — Problem Solving

**33.** *4-digit password using different digits from 0–9, order matters. How many unique passwords? Identify the formula.*

> Order matters and digits can't repeat → permutation.
> 10P4 = 10!/(10−4)! = 10×9×8×7 = 5,040.
>
> **Answer: 5,040 (using 10P4)**

**34.** *Select 3 students from 20 for identical (unranked) research awards. How many selections?*

> Awards are identical → order doesn't matter → combination.
> 20C3 = (20×19×18)/(3×2×1) = 6,840/6 = 1,140.
>
> **Answer: 1,140 (using 20C3)**

**35.** *From 6 women and 5 men, form a committee of 3 women and 2 men. How many ways?*

> Choose the women and men separately, then multiply (Fundamental Counting Principle).
> 6C3 = (6×5×4)/(3×2×1) = 120/6 = 20 ways to choose the women.
> 5C2 = (5×4)/(2×1) = 20/2 = 10 ways to choose the men.
> Total = 20 × 10 = 200.
>
> **Answer: 200**

---

## PART 4: Applications in Research (25 pts)

### Section A — Multiple Choice

**36.** *A Naive Bayes spam filter applies which probability concept?*

> Naive Bayes classifiers compute P(class | evidence) directly using Bayes' Theorem.
>
> **Answer: B. Conditional probability (Bayes' Theorem)**

**37.** *A/B test: p-value = 0.03, significance threshold = 0.05. What does this mean?*

> Since 0.03 < 0.05, the result falls in the rejection region — the observed difference is unlikely to be due to chance alone.
>
> **Answer: B. Reject the null hypothesis; the difference is statistically significant**

**38.** *How many unique 5-card poker hands from a 52-card deck?*

> Card order within a hand doesn't matter → combination, not permutation.
> 52C5 = 52!/(5!×47!) = 2,598,960.
>
> **Answer: B. 52C5 = 2,598,960**

**39.** *In proper random sampling, every member of the population:*

> This is the defining property of a simple random sample — it avoids selection bias.
>
> **Answer: B. Has an equal and known chance of being selected**

### Section B — Short Answer Problems

**40.** *9 input features; test all possible 3-feature subsets. How many subsets? Which formula, and why?*

> A "subset" of features is unordered — {A,B,C} is the same subset as {C,B,A} — so this is a combination, not a permutation.
> 9C3 = 9!/(3!×6!) = (9×8×7)/(3×2×1) = 504/6 = 84.
>
> **Answer: 84 subsets, using 9C3**

**41.** *P(Attack)=0.05, P(Flagged|Attack)=0.90, P(Flagged|Normal)=0.02. If flagged, find P(actually an Attack) using Bayes' Theorem.*

> Step 1 — Law of Total Probability for P(Flagged):
> P(Flagged) = P(Flagged|Attack)×P(Attack) + P(Flagged|Normal)×P(Normal)
> = (0.90×0.05) + (0.02×0.95) = 0.045 + 0.019 = 0.064.
>
> Step 2 — Bayes' Theorem:
> P(Attack|Flagged) = [P(Flagged|Attack)×P(Attack)] / P(Flagged) = 0.045 / 0.064 ≈ 0.7031.
>
> **Answer: ≈ 0.703 (about 70.3%)**

### Section C — Case Study: Course Recommendation System

**42(a).** *Using the General Addition Rule, find P(Python OR Data Science). [300 Python, 200 Data Science, 120 both, out of 500]*

> P(Python or DS) = P(Python) + P(DS) − P(both) = 300/500 + 200/500 − 120/500 = 380/500 = 0.76.
>
> **Answer: 0.76 (76%)**

**42(b).** *Find P(enrolled in AI/ML | completed Python), and interpret. [80 of the 300 Python completers enrolled in AI/ML]*

> P(AI/ML | Python) = (students who did both) / (students who completed Python) = 80/300 ≈ 0.2667.
> Interpretation: about 26.7% of students who completed the Python course went on to enroll in the AI/ML elective.
>
> **Answer: 80/300 ≈ 0.267 (about 26.7%)**

**42(c).** *The team randomly selects 3 students to interview from the 120 who completed both courses. How many unique groups of 3?*

> Interview groups are unordered → combination.
> 120C3 = (120×119×118)/(3×2×1) = 1,685,040/6 = 280,840.
>
> **Answer: 280,840 (using 120C3)**

**42(d).** *Are 'completed Python' and 'enrolled in AI/ML' independent? Prove it using the multiplication rule.*

> Working assumption (see note below): the 80 AI/ML enrollees are the only AI/ML enrollees reported, so P(AI/ML) = 80/500 = 0.16, and P(Python) = 300/500 = 0.6.
> If independent, we would expect P(Python and AI/ML) = P(Python) × P(AI/ML) = 0.6 × 0.16 = 0.096 → 48 students.
> The actual overlap is 80 students (P = 0.16), which is much higher than the 48 students (0.096) expected under independence.
> Since actual ≠ expected, the events are NOT independent — completing Python is associated with a higher chance of enrolling in AI/ML.
>
> **Answer: DEPENDENT (not independent)**

> **NOTE:** The worksheet doesn't state how many total students (including non-Python students) enrolled in AI/ML. This solution assumes all 80 AI/ML enrollees came from the Python group (i.e., total AI/ML enrollment = 80), since no other figure is given. This is the standard reading intended for a classroom exercise, but it's worth confirming with your instructor if additional data exists.

---

> **VERIFICATION SUMMARY**
>
> All 42 items were independently recalculated to confirm each answer. Every multiple-choice key was checked against the distractors to make sure the reasoning eliminates the other options, not just matches one. Two items (15 and 42d) involve either an equivalent-value distractor or an unstated assumption — both are called out above so students and instructors can see the reasoning transparently.