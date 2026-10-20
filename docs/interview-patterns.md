# Pattern-focused interview learning

Design research, 2026-10-20, performed in the learner's Ego browser. This is development research, not an in-app web-research feature.

## Findings

- [NeetCode roadmap](https://neetcode.io/roadmap) organizes practice around reusable categories such as arrays/hashing, two pointers, sliding windows, stacks, trees, heaps, graphs, dynamic programming and intervals. It does not make each question a new programming-language course.
- [Tech Interview Handbook study cheatsheet](https://www.techinterviewhandbook.org/algorithms/study-cheatsheet/) recommends understanding patterns rather than memorizing solutions. Its topic structure combines the representation/operations, complexities, corner cases, techniques and practice.
- [Its interval chapter](https://www.techinterviewhandbook.org/algorithms/interval/) groups merging, insertion, non-overlap and meeting-room tasks. Sorting is a recurring technique. Adjacent tasks are practice opportunities, not all prerequisites to solve Merge Intervals. Its overlap snippet uses strict comparisons; this must not be silently applied to closed intervals that include touching endpoints.
- [Princeton Algorithms, Interval1D](https://algs4.cs.princeton.edu/12oop/Interval1D.java.html) explicitly defines a closed interval as containing both endpoints. Its primary reference implementation documents and implements intersection, point membership and interval containment. This is relevant evidence for the failed interval lesson; Python's comparison documentation alone is not.
- [OpenStax Precalculus 2e, Domain and Range](https://openstax.org/books/precalculus-2e/pages/1-2-domain-and-range) explains interval notation and included/excluded endpoints. Read during research; not required by the current fixed interval lesson, which uses Princeton plus Python language documentation.

## Product decisions for this revision

The original shared prompt demanded 15–40 concepts and assumed no knowledge of the selected language. That produced a 23-concept interview course, compared with the existing 10-concept BPE ticket. Separate interview planning now targets 3–6 core skills, enforces at most 8 including transitive prerequisites, and permits up to 3 optional refreshers and 2 optional extensions per ticket. These numerical bounds are product choices to constrain scope, not experimentally proven optimal lesson counts.

Start from the underlying representation/data structure; introduce only relevant operations, a visual pattern model, state/invariant, and independent transfer. Explain essential syntax inline without assuming language proficiency. Avoid a mandatory lesson for every edge case or target-solution substep. Preserve Learn → Predict → Modify → Practice.

For the known old Python Merge Intervals path, an idempotent curriculum-v2 migration adds four core skills: interval model, ordering, sorted scan/invariant, independent practice/transfer. Original concept IDs remain in their original ticket under Previous path, with saved lessons, progress and logs untouched. The original project is backed up before migration. Personal project curricula are unchanged.

## Source correction

Select domain sources for domain rules and language sources for syntax. Interval lessons include Princeton's closed-interval reference before generation. Generated readings must stay within the supplied evidence; original deductions must show their reasoning and remain auditable. The semantic audit and exact-quote validation remain required. No automatic audit retries were added; failures cannot start an unbounded paid repair loop.

Live follow-up: the first interval-model attempt supported the mathematics but correctly rejected unsourced inline Python syntax. Compact interview lessons now supplement domain references with the official Python tutorial's list/indexing and function sections. URLs are deduplicated and bounded to six; required inline sources take priority over extra planned references. This supports explaining syntax inline rather than restoring a long required syntax curriculum. The strict audit is unchanged.
