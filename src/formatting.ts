// MOM (Minutes of Meeting) Formatting Functions

export function formatInternalMOM(transcriptData: any, meetingInfo: any): string {
  const { text, language, duration } = transcriptData
  const { title, attendees, date } = meetingInfo
  
  return `# Internal Meeting Notes
## ${title || 'Team Meeting'}

**Date:** ${date || new Date().toLocaleDateString()}
**Duration:** ${formatDuration(duration)}
**Language:** ${language || 'Unknown'}
${attendees ? `**Attendees:** ${attendees}` : ''}

---

## Discussion

${text}

---

## Action Items
[ ] Extract action items from discussion
[ ] Assign owners
[ ] Set deadlines

## Next Steps
- Review transcript
- Distribute to team
- Schedule follow-up

---
*This is an internal document. Not for external distribution.*
`
}

export function formatClientMOM(transcriptData: any, meetingInfo: any): string {
  const { text, language, duration } = transcriptData
  const { title, attendees, date, company } = meetingInfo
  
  return `# Minutes of Meeting
## ${title || 'Client Meeting'}

**Date:** ${date || new Date().toLocaleDateString()}
**Duration:** ${formatDuration(duration)}
**Company:** ${company || '[Company Name]'}
${attendees ? `**Participants:** ${attendees}` : ''}

---

## Meeting Objectives
[To be filled based on discussion]

## Key Discussion Points

${formatDiscussionPoints(text)}

## Decisions Made
1. [Decision 1]
2. [Decision 2]
3. [Decision 3]

## Action Items

| # | Action Item | Owner | Due Date | Status |
|---|-------------|-------|----------|--------|
| 1 | [Item 1] | [Name] | [Date] | Pending |
| 2 | [Item 2] | [Name] | [Date] | Pending |

## Next Meeting
**Proposed Date:** [TBD]
**Agenda:** [To be determined]

---

*This document is confidential and intended for authorized recipients only.*

---

**Prepared by:** [Your Name]
**Distribution:** [Distribution List]
`
}

export function formatStandardTranscript(transcriptData: any, meetingInfo: any): string {
  const { text, language, duration, segments } = transcriptData
  const { title, date } = meetingInfo
  
  let output = `# Transcript
## ${title || 'Meeting Recording'}

**Date:** ${date || new Date().toLocaleDateString()}
**Duration:** ${formatDuration(duration)}
**Language:** ${language || 'Unknown'}

---

## Full Transcript

`

  if (segments && segments.length > 0) {
    segments.forEach((segment: any, index: number) => {
      output += `**[${formatTimestamp(segment.start)}]** ${segment.text}\n\n`
    })
  } else {
    output += text
  }
  
  output += `\n---\n*End of transcript*`
  
  return output
}

// Helper functions
function formatDuration(seconds?: number): string {
  if (!seconds) return 'Unknown'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function formatDiscussionPoints(text: string): string {
  // Split into paragraphs and format as bullet points
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0)
  
  if (paragraphs.length === 1) {
    // Single paragraph - just return as is
    return text
  }
  
  // Multiple paragraphs - format as list
  return paragraphs.map(p => `- ${p.trim()}`).join('\n\n')
}
