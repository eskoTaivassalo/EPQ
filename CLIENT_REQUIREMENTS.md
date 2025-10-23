# Client Requirements - Parents&Teachers App
## First Client Meeting Summary

**Date:** October 22, 2025  
**Client:** Esko Taivassalo  
**Project:** Parents&Teachers Platform v1.0

---

## 🎯 1. VISION & OBJECTIVES

### Core Vision
**Main Purpose:**  
Connect parents seeking educational support with qualified teachers through a secure, reliable platform. The platform will later expand to other social sectors such as doctors, therapists, and other professionals.

**Problem We Solve:**
- **Reliability & Trust:** Strong authentication (Google authentication) provides more security than Facebook groups
- **Better Privacy:** Controlled environment vs. public Facebook groups
- **Transparency:** Clear profiles, verified identities, and secure communication

**Target Users:**
- **Primary:** Parents and Teachers
- **Student Age Range:** Elementary school through high school (ages 6-18)

### Business Objectives

**User Growth Target (6-12 months):**
- ❓ **NEEDS CLARIFICATION** - What is the specific user target?
  - 100 teachers?
  - 500 parents?
  - Specific geographic market penetration?

**App Type:** PAID APPLICATION

**Monetization Strategy:**
Multiple options discussed - **NEEDS DECISION:**

1. **Commission Model** (10-20% per lesson booking)
   - ✅ Pros: Pay-as-you-go, scales with usage
   - ⚠️ Cons: Requires payment integration from day 1

2. **Monthly Subscription for Teachers** (€??/month for listing)
   - ✅ Pros: Predictable revenue, simple to implement
   - ⚠️ Cons: May limit teacher adoption initially

3. **Freemium Model** (Basic free, premium features paid)
   - ✅ Pros: Lower barrier to entry
   - ⚠️ Cons: Complex to balance free vs. paid features

**💡 RECOMMENDATION NEEDED:** Which monetization model to implement in MVP?

---

## 👥 2. TARGET AUDIENCE & USERS

### Teachers
**Types of Teachers:**
- ❓ **NEEDS CLARIFICATION:**
  - Professional certified teachers?
  - University students studying education?
  - Hobbyist/passion teachers?
  - Any qualification requirements?

**Subjects/Skills:**
- Mathematics, Languages, Music, Sports, etc. (tag-based system already implemented)

**Age/Qualification Requirements:**
- ❓ **NEEDS CLARIFICATION:**
  - Minimum age (18+, 21+)?
  - Required certifications?
  - Background check requirements?

### Parents
**Children's Age Range:** Elementary through High School (ages 6-18) ✅

**Geographic Focus:**
- **Primary:** Remote/Online teaching (video-based lessons)
- **Secondary:** Local in-person option available
- **Strategy:** Focus on remote teaching for easier internationalization

**❓ QUESTION:** Should local/in-person teaching be:
1. Available from v1.0 but not emphasized?
2. Added in v2.0 after video features are stable?
3. Equal priority with remote teaching?

---

## ✨ 3. CORE FEATURES

### MUST-HAVE (v1.0 MVP - December 2025)

✅ **Already Implemented:**
- User registration (Parent/Teacher roles)
- User profiles (hourly rate, subjects, experience)
- Tag-based teacher search

🚧 **To Be Implemented:**
1. **In-app Messaging System** (PRIORITY 1)
   - Real-time chat between parents and teachers
   - Message history
   - Read/unread status
   - Push notifications

2. **Booking/Reservation System** (PRIORITY 2)
   - Calendar integration
   - Lesson scheduling
   - Booking confirmation/rejection
   - Automated reminders

3. **Payment Integration** (PRIORITY 3)
   - Stripe/PayPal integration
   - In-app payment processing
   - Invoice generation
   - Commission handling (if commission model chosen)

4. **Calendar Integration** (PRIORITY 2)
   - Google Calendar integration
   - Teacher availability management
   - Parent booking calendar
   - Sync with external calendars

5. **Push Notifications** (PRIORITY 2)
   - New message alerts
   - Booking confirmations
   - Lesson reminders
   - Payment notifications

6. **Video Lesson Support** (PRIORITY 1)
   - **v1.0 Approach:** Zoom link integration
     - Teachers can add Zoom meeting links to bookings
     - Automated link sharing with parents
     - Simple and fast to implement
   - **v2.0+ Enhancement:** Built-in video chat (2026)

### NICE-TO-HAVE (Post v1.0)
- ⏳ Reviews/Ratings system
- ⏳ Advanced search filters
- ⏳ Teacher portfolios (photos, videos, certificates)
- ⏳ Group lessons support

---

## 💰 4. BUSINESS MODEL

### Monetization
**App is PAID, not free** ✅

**Payment Model Options** (NEEDS DECISION):

| Model | Implementation Complexity | Revenue Predictability | User Adoption |
|-------|---------------------------|------------------------|---------------|
| Commission (10-20%) | High (payment gateway required) | Variable | Medium |
| Monthly Subscription (€9.99) | Medium | High | Low initially |
| Freemium | High (feature gating) | Medium | High |

**💡 CLIENT DECISION NEEDED:**
1. Which monetization model for v1.0?
2. If commission: what percentage (10%, 15%, 20%)?
3. If subscription: what price point?
4. Should parents pay, teachers pay, or both?

### Payment Methods
- ✅ Stripe integration (primary)
- ✅ PayPal integration (alternative)
- ✅ In-app payment processing (no external payment handling)

**❓ CLARIFICATION NEEDED:**
- Payment currency: EUR, USD, or multi-currency?
- VAT/Tax handling: automatic or manual?
- Refund policy: what are the rules?

---

## 📱 5. TECHNICAL IMPLEMENTATION

### Platforms
- ✅ **iOS** (required for v1.0)
- ✅ **Android** (required for v1.0)
- ⏳ **Web App** (React-based, development parallel but release in 2026)

### Third-Party Integrations

**Confirmed for v1.0:**
1. **Google Calendar** - Scheduling and availability
2. **Google Cloud Messaging (FCM)** - Push notifications
3. **Zoom API** - Video lesson links (initially)
4. **Stripe/PayPal** - Payment processing
5. **Google Authentication** - Secure sign-in

**Potential Future Integrations:**
- Microsoft Teams (alternative to Zoom)
- Apple Calendar
- Email service (SendGrid/Mailgun) for notifications

### Security & Privacy

**Identity Verification:**
- ✅ Google authentication (strong authentication)
- ❓ **NEEDS CLARIFICATION:** Teacher background checks?
  - Criminal record check required?
  - Certificate/diploma verification?
  - Manual review process?
  - Third-party verification service?

**Child Safety:**
- ✅ GDPR compliance (already implemented)
- ❓ **Age verification for parents?**
- ❓ **Parental consent for minors?**
- ❓ **Chat monitoring/moderation?**

**Data Protection:**
- ✅ GDPR compliant
- ✅ Secure data storage (Firebase)
- ✅ Encrypted communications
- ❓ **Data residency requirements?** (EU only? US? Global?)

---

## 📅 6. TIMELINE & BUDGET

### Launch Schedule

**v1.0 MVP - December 31, 2025** (FIXED DEADLINE)
- No flexibility in timeline ✅
- Academic project (thesis work) - Free development ✅
- Beta testing starts: December 15, 2025 ✅

**Web App - Q1 2026** (January-March)
- Budget: ❓ **NEEDS CLARIFICATION**

**v2.0 - 2026** (Throughout the year)
- Budget: ❓ **NEEDS CLARIFICATION**

### Budget Breakdown

**v1.0 MVP Budget: $1,000** (€?? approximately)

**Budget Allocation Suggestion:**
```
Third-party services (monthly costs for 3 months):
├── Firebase Blaze Plan: $150 (~$50/month)
├── Stripe fees: $0 (pay-as-you-go)
├── Zoom API: $0 (free tier initially)
├── Google Cloud Messaging: $0 (free tier)
├── App Store fees: $99/year (iOS)
├── Google Play fees: $25 (one-time)
└── Reserve for testing/misc: $626

⚠️ WARNING: $1,000 is VERY LIMITED for MVP with:
- Payment integration
- Video features
- Calendar integration
- Push notifications
```

**💡 RECOMMENDATION:**
Given the budget constraint, consider:
1. Use Firebase free tier as long as possible
2. Implement Zoom links (not custom video) for v1.0
3. Focus on 2-3 core features instead of all 6
4. Phase feature rollout to manage costs

**❓ QUESTIONS:**
1. Is there additional budget if costs exceed $1,000?
2. Who covers ongoing monthly costs after launch?
3. Budget for marketing/user acquisition?

### Maintenance & Ongoing Development

**Post-Launch Maintenance:** Esko Taivassalo ✅

**Development Agreement:**
- First app release is FREE (academic project) ✅
- Post-v1.0 work: **Contract-based agreement** ✅
- Ongoing development: **Required throughout app lifecycle** ✅

**❓ CLARIFICATION NEEDED:**
- Hourly rate for post-v1.0 work?
- Retainer vs. project-based?
- Support SLA (response time, bug fixes)?

---

## 🎨 7. BRANDING & DESIGN

### Visual Identity
**❓ ALL NEEDS CLARIFICATION:**

1. **Brand Guidelines:**
   - Logo: Existing or needs design?
   - Color palette: Specific colors in mind?
   - Typography: Preferred fonts?
   - Design style: Modern? Professional? Playful?

2. **Reference Apps:**
   - Which apps have design you like?
   - Competitors to reference?
   - Design inspiration sources?

3. **Brand Mood:**
   - Professional and trustworthy?
   - Fun and approachable?
   - Modern and tech-forward?
   - Suggested: **Professional yet approachable** (trust + accessibility)

**💡 RECOMMENDATION:**
For MVP on tight budget, use:
- Clean, modern, minimalist design
- Consistent color scheme (2-3 primary colors)
- Standard system fonts (SF Pro for iOS, Roboto for Android)
- Professional stock photos (Unsplash, Pexels)

---

## 📊 8. COMPETITORS & DIFFERENTIATION

### Known Competitors
- Superprof
- Tutor.fi
- Facebook groups
- Local tutoring agencies

**❓ NEEDS MORE DETAIL:**
1. Who are the main competitors in target market?
2. What do they charge?
3. What features do they have/lack?

### Unique Selling Points (USP)

**✅ Confirmed USPs:**

1. **Safety & Security**
   - Strong authentication (Google)
   - Verified user identities
   - Secure platform vs. Facebook groups

2. **Transparency**
   - Clear teacher profiles
   - Visible qualifications
   - Transparent pricing
   - Review system (future)

3. **Privacy**
   - GDPR compliant
   - Controlled environment
   - No public exposure (vs. Facebook)

4. **Child-Focused Safety**
   - Secure communication
   - Protected environment
   - Parental controls (potential)

**❓ ADDITIONAL USPs TO CONSIDER:**
- Lower commission than competitors?
- Better matching algorithm?
- Video integration from day 1?
- International reach?

---

## 🧪 9. TESTING & LAUNCH

### Beta Testing
- **Beta Testers Available:** YES ✅
- **Beta Start Date:** December 15, 2025 ✅
- **Beta Duration:** ~2 weeks before v1.0 launch

**❓ QUESTIONS:**
1. How many beta testers (10? 50? 100)?
2. Mix of teachers and parents?
3. Incentives for beta testers?
4. Feedback collection method?

### Launch Strategy

**App Store Distribution:**
- **iOS App Store:** Esko handles listing ✅
- **Google Play Store:** Esko handles listing ✅

**❓ MARKETING PLAN NEEDED:**
1. How will you acquire first users?
   - Social media?
   - Paid ads?
   - Word of mouth?
   - Educational institutions partnerships?
2. Launch marketing budget?
3. PR/Press release plan?
4. Influencer partnerships?

**💡 SUGGESTIONS:**
- Start with teacher acquisition (supply-side first)
- Offer launch incentives (first 100 teachers free for 3 months?)
- Partner with 2-3 schools for pilot program
- Local Facebook/community groups for initial awareness

---

## 📝 10. FUTURE DEVELOPMENT

### Planned Features (6-12 months post-launch)

**Confirmed:**
1. **Integrated Video Chat** (v2.0 - 2026)
   - Move from Zoom links to built-in video
   - Screen sharing
   - Recording capabilities
   - Whiteboard integration

2. **Advanced Features** (2026)
   - Enhanced teacher profiles
   - Portfolio/gallery
   - Certificate verification
   - Skills assessments

3. **Monetization Optimization**
   - A/B testing pricing models
   - Dynamic pricing
   - Promotional campaigns
   - Referral programs

4. **Partnership Development**
   - Educational institutions
   - Corporate training programs
   - Government education programs
   - NGO partnerships

5. **Team Scaling**
   - Customer support team
   - Marketing team
   - Additional developers
   - QA/Testing team

### Internationalization

**✅ v1.0 is ENGLISH FIRST**
- English as primary language ✅
- Built for international market from day 1 ✅
- Focus on remote teaching enables global reach ✅

**Additional Languages (future):**
- Spanish
- French
- German
- Mandarin Chinese
- (based on user demand)

**❓ CLARIFICATION:**
1. Target countries for initial launch?
   - US/Canada?
   - UK/Ireland?
   - EU countries?
   - Global from day 1?
2. Currency handling?
   - USD only?
   - Multi-currency support?
3. Time zone handling?
   - Critical for booking system
   - Automated conversion?

---

## 🚨 CRITICAL QUESTIONS & DECISIONS NEEDED

### HIGH PRIORITY (Affects MVP Development)

1. **Monetization Model** ⚠️ URGENT
   - Commission, subscription, or freemium?
   - Who pays: teachers, parents, or both?
   - Price points?

2. **Feature Prioritization** ⚠️ URGENT
   - With $1,000 budget, which 3 features are MUST-HAVE?
   - Suggested: Messaging + Booking + Payment
   - Or: Messaging + Booking + Video (defer payment to v1.1?)

3. **Teacher Verification** ⚠️ URGENT
   - Manual review process?
   - Background check requirement?
   - Certificate verification?
   - Who verifies? How?

4. **Geographic Launch Market** ⚠️ URGENT
   - US? EU? Global?
   - Affects payment integration (Stripe availability)
   - Affects legal/compliance requirements

### MEDIUM PRIORITY (Affects Planning)

5. **Brand Identity**
   - Logo design budget?
   - Color scheme preferences?
   - Design references?

6. **Beta Testing Details**
   - Number of beta testers?
   - Incentives?
   - Feedback tools?

7. **Marketing Strategy**
   - User acquisition plan?
   - Marketing budget?
   - Launch partnerships?

### LOW PRIORITY (Post-Launch)

8. **Web App Timeline**
   - Exact launch date in 2026?
   - Feature parity with mobile?
   - Budget allocation?

9. **v2.0 Scope**
   - Feature list finalization?
   - Budget?
   - Team expansion needs?

---

## 📋 NEXT STEPS

### Immediate Actions (This Week)

1. **Client Decisions Required:**
   - [ ] Choose monetization model
   - [ ] Prioritize top 3 MVP features
   - [ ] Confirm teacher verification approach
   - [ ] Define target launch market(s)

2. **Technical Planning:**
   - [ ] Create detailed feature specifications
   - [ ] Design database schema for bookings/payments
   - [ ] Research Stripe/PayPal integration best practices
   - [ ] Design calendar integration architecture

3. **Design & Branding:**
   - [ ] Gather design references
   - [ ] Define color palette
   - [ ] Create basic logo (or hire designer)
   - [ ] Design key screens wireframes

### Next Week

4. **Development Sprint Planning:**
   - [ ] Break features into 2-week sprints
   - [ ] Set up project tracking (Trello boards)
   - [ ] Allocate budget to third-party services
   - [ ] Create testing plan

5. **Legal & Compliance:**
   - [ ] Review GDPR requirements for payments
   - [ ] Draft Terms of Service
   - [ ] Draft Privacy Policy
   - [ ] Review child safety regulations

---

## 💰 BUDGET REALITY CHECK

### Current Budget: $1,000 for MVP

**Minimum Required Costs:**
```
App Store Fees:
├── Apple Developer: $99/year
├── Google Play: $25 one-time
└── Total: $124

Development Services (if needed):
├── Logo design: $50-200
├── Legal docs review: $100-300
└── Beta testing tools: $0-50

Third-Party APIs:
├── Firebase (free tier, then ~$50/month)
├── Stripe (free setup, 2.9% + $0.30 per transaction)
├── Zoom (free tier for basic)
└── Google APIs (free tier)

TOTAL FIXED COSTS: ~$200-500
REMAINING FOR DEVELOPMENT: $500-800
```

**⚠️ WARNING:**
$1,000 budget is extremely tight for:
- In-app messaging system (complex)
- Payment integration (complex)
- Calendar integration (complex)
- Video features (medium)
- Push notifications (medium)

**💡 RECOMMENDATION:**

**Option A: MVP Lite ($1,000)**
Focus on 3 core features:
1. Teacher search & profiles ✅ (done)
2. In-app messaging
3. Zoom link integration
- Defer payment integration to v1.1
- Defer calendar to v1.1

**Option B: Full MVP ($2,500-3,500)**
All planned features:
1. Messaging
2. Booking + Calendar
3. Payment integration
4. Video (Zoom)
5. Push notifications
- Requires additional budget
- More professional launch

**Option C: Phased Launch**
- v1.0 (December): Core features ($1,000)
- v1.1 (January): Payment integration ($500)
- v1.2 (February): Calendar integration ($500)
- Total: $2,000 spread over 3 months

**CLIENT DECISION NEEDED:** Which approach?

---

## 📞 CONTACT & FOLLOW-UP

**Project Lead:** Esko Taivassalo  
**Next Meeting:** [To be scheduled]  
**Agenda:** Review answers to critical questions above

**Questions for Next Meeting:**
1. Monetization model decision
2. Feature prioritization
3. Budget adjustment (if needed)
4. Brand identity direction
5. Launch market definition

---

**Document Version:** 1.0  
**Last Updated:** October 22, 2025  
**Status:** Awaiting Client Decisions on Critical Questions

---

*This document will be updated as decisions are made and requirements are clarified.*
