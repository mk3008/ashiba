# Exit cost

E1 is a non-aggregate removal control. It copies a durable successful
candidate, asks for replacement of the arm's main data-access treatment with
native pg while preserving G1 behavior, and uses runner-owned source/diff,
treatment-marker, and live checks.

The E1 packet required two documented pre-execution corrections (H-004 and
H-005). Schema v2 now retains one durable E1 document per arm. Each records a
passing treatment-removal scan and a passing runner-owned G1 result after the
selected candidate was converted to native pg. These are six bounded
observations, not a universal removability claim. The index does not provide a
normalized cross-arm file-change, repair-cause, or long-run coupling score, so
this report does not rank exit cost.
