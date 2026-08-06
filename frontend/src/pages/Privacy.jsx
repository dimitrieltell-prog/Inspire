import { Link } from 'react-router-dom'

function Section({ title, children }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold mb-2.5">{title}</h2>
      <div className="text-sm text-slate leading-relaxed flex flex-col gap-3">{children}</div>
    </div>
  )
}

export default function Privacy() {
  return (
    <div className="max-w-2xl mx-auto px-7 py-16">
      <span className="text-xs font-bold uppercase tracking-wide text-indigo">Legal</span>
      <h1 className="text-3xl font-bold mt-3 mb-2">Privacy Policy</h1>
      <p className="text-xs text-slate-light mb-10">Last updated: July 27, 2026</p>

      <Section title="Overview">
        <p>
          This Privacy Policy explains what information Inspire collects, how we use it, and the
          choices you have. We built Inspire to be a private, low-pressure space — we don't sell
          your personal information to advertisers or data brokers.
        </p>
      </Section>

      <Section title="Information we collect">
        <p><strong>Account information:</strong> your email, display name, username, date of birth, and a hashed version of your password (we never store your actual password).</p>
        <p><strong>Content you create:</strong> stories, comments, reactions, ephemeral Stories, direct sends, and any photos or videos you upload.</p>
        <p><strong>Profile details you choose to add:</strong> bio, pronouns, links, schools, and business info if you set up a business account.</p>
        <p><strong>Payment information:</strong> if you subscribe to Premium, our payment processor Stripe handles your card details directly — we never see or store your full card number.</p>
        <p><strong>Usage information:</strong> general activity (for example, what you've reacted to, saved, or when you were last active) so features like your feed and activity history work.</p>
      </Section>

      <Section title="How we use your information">
        <ul className="list-disc pl-5 flex flex-col gap-1.5">
          <li>To operate core features — your feed, posting, messaging, notifications, and search</li>
          <li>To power Premium features and process subscription payments</li>
          <li>To enforce our content guidelines, review reports, and keep the community safe</li>
          <li>To respond to you if you contact us for support</li>
          <li>To comply with legal obligations, like responding to lawful requests from authorities</li>
        </ul>
      </Section>

      <Section title="Who we share information with">
        <p>We don't sell your personal information. We share it only with:</p>
        <ul className="list-disc pl-5 flex flex-col gap-1.5">
          <li><strong>Stripe</strong> — to process Premium payments</li>
          <li><strong>Cloudinary</strong> — to store and serve photos/videos you upload</li>
          <li><strong>Google</strong> — only if you choose to sign in with Google</li>
          <li><strong>Our AI provider</strong> — to generate Aria's replies (see below)</li>
          <li><strong>Law enforcement or regulators</strong> — only when legally required, or to report illegal content such as child sexual abuse material, which we're legally obligated to do</li>
        </ul>
        <p>
          Other users can see what you choose to make public — your posts (unless anonymous), your
          profile, and your public activity. Anonymous posts never show your name or account to
          other users.
        </p>
      </Section>

      <Section title="Aria (our AI feature)">
        <p>
          When you message Aria, that message is sent to a third-party AI provider (OpenAI) to
          generate a reply. Per that provider's standard API terms, conversation content sent
          through their API is not used to train their models. Aria is not a therapist — please
          see our <Link to="/terms" className="text-indigo font-semibold hover:underline">Terms of Service</Link> for more on Aria's limitations.
        </p>
      </Section>

      <Section title="Children's privacy">
        <p>
          Inspire is not directed at children, and you must be at least 13 years old to create an
          account — we ask for your date of birth at signup to enforce this. If we learn that
          someone under 13 has created an account, we'll delete it and the associated data.
        </p>
      </Section>

      <Section title="Your choices and rights">
        <p>You're in control of your information. From Settings, you can:</p>
        <ul className="list-disc pl-5 flex flex-col gap-1.5">
          <li><strong>Download your data</strong> — get a copy of your profile, posts, replies, and activity</li>
          <li><strong>Delete your account</strong> — permanently removes your account and everything in it</li>
          <li><strong>Block, mute, or report</strong> — control who can interact with you and flag content for review</li>
          <li><strong>Edit or remove</strong> — any profile info or post, anytime</li>
        </ul>
        <p>These choices are available to everyone, regardless of where you live.</p>
      </Section>

      <Section title="Data retention">
        <p>
          We keep your information for as long as your account is active. If you delete your
          account, we remove your data promptly, except where we're required to keep limited
          records for legal, security, or fraud-prevention reasons.
        </p>
      </Section>

      <Section title="Security">
        <p>
          We use industry-standard measures to protect your data, including encrypted connections
          and password hashing. No system is perfectly secure, so we can't guarantee absolute
          security, but we work to protect your information and will notify you if we're ever
          required to by law in the event of a breach.
        </p>
      </Section>

      <Section title="International users">
        <p>
          Inspire is operated from and stores data in the United States. If you're using Inspire
          from another country, your information will be transferred to and processed in the US.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. If we make material changes, we'll
          let you know in the app before they take effect.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about this policy or your data? Reach us at{' '}
          <a href="mailto:support@inspirerealexperiences.com" className="text-indigo font-semibold hover:underline">
            support@inspirerealexperiences.com
          </a>.
        </p>
      </Section>

      <p className="text-xs text-slate-light border-t border-line pt-5 mt-10">
        This document is a plain-language template intended to reasonably reflect how Inspire
        actually handles data. It hasn't been reviewed by an attorney and isn't a substitute for
        legal advice specific to your business.
      </p>
    </div>
  )
}
