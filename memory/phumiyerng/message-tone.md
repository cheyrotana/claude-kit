---
name: message-tone
description: "User-facing error/validation messages must sound professional and polite (\"Please ...\"), in both Khmer and English"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 4b557c4e-72ae-45c9-8356-8c77dbf86c35
  modified: 2026-11-12T14:58:51.963Z
---

Write validation and error messages as full, polite sentences that start with "Please" (Khmer "សូម..."), ending with a full stop (Khmer "។"). Example: "Please also enter this information in Khmer." / "សូមបំពេញព័ត៌មាននេះជាភាសាខ្មែរផងដែរ។"

**Why:** the user saw "Enter it in Khmer too" (Mobile-143) and asked for it to be "professional sounding and serious with Please".

**How to apply:** any new string in the l10n `*Strings` files that tells the user to do something.

Related: [[testing-setup]].
