---
name: message-pack
description: Prepare a message for someone (a teammate, lead, lecturer, client) together with the files it needs, ready to send in Telegram (or Slack, email, any chat) - write the message in the user's voice, check its links and facts, gather or make the attachments (reports, docs, PDFs, screenshots, images), zip several files into one, and load the clipboard so Ctrl+V attaches the file and Win+V pastes the message. Use whenever the user says "write a message to X", "send X the files", "prepare a message with attachments", "what do I send to X", "zip the screenshots and write a message", "hand this over to X", or wants a message plus attachments for anyone, even if they don't mention zipping, the clipboard or Telegram.
---

# Message pack

The goal is the least work for the user: in the chat, Ctrl+V attaches the file, Win+V pastes the message into the caption, and they press Send. You can't press Send or choose the chat yourself (there is no messaging connector). If a mail or chat connector is available and the user wants it there, you may put the message in as a draft, but only send with their explicit OK.

Why this shape, from testing in Telegram Desktop:
- One Ctrl+V can't carry both: with a file and text on the clipboard together, Telegram attaches the file and drops the text.
- Telegram's `-sendpath` ("send this file") ignores the file when Telegram is already running, which is nearly always, so it isn't used.
- So the file goes on the clipboard (Ctrl+V) and the message waits in Windows clipboard history (Win+V). When clipboard history is off, the script falls back to Explorer: drag the file in, Ctrl+V the message.

## 1. Work out what goes in

From the conversation, decide:
- **Who** it's for, and what they need to do with it (paste into a report, review, approve, answer a question).
- **What to attach**: the files the recipient needs, not every file you made.
- **What to ask**: only requests the user wants to make. Don't add requests, caveats or limitations the user didn't ask for or told you to leave out.

Ask only if the recipient or the contents are genuinely unclear. Otherwise go ahead.

## 2. Check before you include anything

A message that sends someone to a broken link or a wrong fact costs the user credibility.
- **Links**: open each one (`curl -s -o /dev/null -w "%{http_code}" -L <url>`) and only include links that work. For an app link, check it reaches the right page, not an error screen inside a 200.
- **Private pages**: claude.ai artifact links are private to the user, so the recipient can't open them. Attach the content as a file instead, or tell the user they must share the page first.
- **Facts**: numbers, names and statuses must be current. Re-check anything that may have changed during the session.
- **Secrets**: never put passwords, tokens, keys or connection strings in the message or the attachment.

## 3. Make the attachments

- Any file type works: PDF, Word, Markdown, images, video, zip.
- **One file goes as it is; several files get zipped** into one attachment (the script decides this).
- Documents the recipient will paste or edit: Markdown or plain text. Convert a page or artifact into a file if needed.
- Images: use existing screenshots. To capture a public page, use headless Chrome with a throwaway profile:
  `"C:/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --hide-scrollbars --user-data-dir=<scratchpad>/chrome-prof --window-size=1440,900 --virtual-time-budget=15000 --screenshot=<out.png> <url>`
  Look at each new screenshot before attaching it. A single image sent alone may be compressed by Telegram; when sharpness matters (screenshots of text), tell the user to untick "Compress" or pass `-Zip`.
- Name files so the recipient knows what each one is, and refer to them by those names in the message.

## 4. Write the message

- The user's voice, first person, addressed to the recipient by name.
- Short and plain: a greeting line, what's attached, links, then any requests as a numbered list.
- Plain text only. Chat apps don't render Markdown tables or headings, so use short lines and simple dashes.
- Don't write file names with extensions that are also web address endings (`.md`, `.sh`, `.py`, `.ai`, `.io`, `.me`, `.co`, `.zip`, `.app`, `.dev`): Telegram turns `report.md` into a link to a website that doesn't exist. Write `report` (or "the report file") instead.
- With an attachment, keep it under 1024 characters so it fits as the caption and arrives as one message. If it can't fit, the user sends the file first and the message right after.
- Save it as `<name>-message.txt` next to the attachments (in the project folder, not the scratchpad), so it survives if the clipboard gets overwritten.

## 5. Run the script

```powershell
& "$HOME\.claude\skills\message-pack\scripts\pack.ps1" -Name <short-name> `
    -MessageFile <path>\<name>-message.txt `
    -Files <doc1>, <doc2> -Images <folder>\*.png -ImagesFolder screenshots
```

It attaches one file as it is or zips several, checks the message for link-looking file names and the caption limit, copies the message to the clipboard and confirms it, then (default `-App paste`) confirms the message is in clipboard history and puts the file on the clipboard. The last line says which mode it ended in: `PASTE MODE` or `EXPLORER MODE` (history off). Options: `-Zip` forces a zip for a single file; `-App explorer` always uses the Explorer drag (handy for email); `-App none` leaves just the message on the clipboard. Leave out `-Files` / `-Images` for a message with no attachment. Fix any WARNING it prints before telling the user to send. If the clipboard copy fails, point the user to the `.txt` file.

Don't run the script again, or copy anything, after telling the user to send: it would replace what's on their clipboard.

## 6. Tell the user

Show the message text so they can read it, then the steps:

**PASTE MODE:**
1. Open the chat with <recipient>, click the message box, press **Ctrl+V**: `<file>` attaches.
2. Click the caption box, press **Win+V** and pick the message (the top text item).
3. Send.

**EXPLORER MODE:** drag `<file>` from the open Explorer window into the chat (or email), click the caption box, press Ctrl+V, send.

**No attachment:** Ctrl+V in the chat and send.

Mention what's in the zip in one line, and the `.txt` path as a fallback (copying anything else replaces the clipboard, so paste soon).
