import { Link } from 'react-router-dom'

function Section({ title, children }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold mb-2.5">{title}</h2>
      <div className="text-sm text-slate leading-relaxed flex flex-col gap-3">{children}</div>
    </div>
  )
}

export default function Terms() {
  return (
    <div className="max-w-2xl mx-auto px-7 py-16">
      <span className="text-xs font-bold uppercase tracking-wide text-indigo">Legal</span>
      <h1 className="text-3xl font-bold mt-3 mb-2">Terms of Service</h1>
      <p className="text-xs text-slate-light mb-10">Last updated: July 27, 2026</p>

      <Section title="1. Agreement to these Terms">
        <p>
          These Terms of Service ("Terms") govern your use of Inspire (the "Service"), including
          our website and mobile apps. By creating an account or using Inspire, you agree to these
          Terms and to our <Link to="/privacy" className="text-indigo font-semibold hover:underline">Privacy Policy</Link>.
          If you don't agree, please don't use Inspire.
        </p>
      </Section>

      <Section title="2. Who can use Inspire">
        <p>
          You must be at least 13 years old to create an account. If you're under 18, you should
          review these Terms with a parent or guardian. By registering, you confirm the birthdate
          you provide is accurate and that you're legally able to enter into this agreement.
        </p>
        <p>
          You're responsible for keeping your login credentials secure and for anything that
          happens under your account. Tell us right away if you think your account has been
          compromised.
        </p>
      </Section>

      <Section title="3. Your content">
        <p>
          You own the stories, comments, photos, and videos you post ("Your Content"). By posting
          on Inspire, you grant us a worldwide, non-exclusive, royalty-free license to host, store,
          reproduce, and display Your Content solely to operate and improve the Service — for
          example, showing your post in other people's feeds or generating a thumbnail. This
          license ends when you delete the content or your account, except where copies remain in
          routine backups for a limited time.
        </p>
        <p>
          You're solely responsible for what you post. Don't post anything you don't have the
          rights to share, or that violates someone else's privacy or intellectual property.
        </p>
      </Section>

      <Section title="4. Community guidelines">
        <p>You agree not to use Inspire to:</p>
        <ul className="list-disc pl-5 flex flex-col gap-1.5">
          <li>Harass, bully, threaten, or hatefully target another person or group</li>
          <li>Post sexual content involving minors, or any other illegal content</li>
          <li>Impersonate another person or misrepresent your affiliation with anyone</li>
          <li>Post spam, scams, or malware, or attempt to access accounts that aren't yours</li>
          <li>Violate any applicable law, or infringe someone's intellectual property or privacy</li>
        </ul>
        <p>
          We have zero tolerance for content that sexually exploits children. We remove it
          immediately upon discovery and report it to the National Center for Missing & Exploited
          Children (NCMEC) and law enforcement as required by law.
        </p>
        <p>
          You can report content or accounts that violate these guidelines directly in the app. We
          review reports and may remove content, restrict features, or suspend or terminate
          accounts that violate these Terms, with or without notice.
        </p>
      </Section>

      <Section title="5. Aria">
        <p>
          Aria is an AI companion feature inside Inspire, powered in part by a third-party AI
          provider. Aria is <strong>not a licensed therapist, counselor, or medical professional</strong>,
          and nothing Aria says is professional mental health advice, diagnosis, or treatment. Aria
          can make mistakes. If you're in crisis or thinking about harming yourself, please contact
          a crisis line or emergency services right away — in the US, call or text{' '}
          <strong>988</strong>.
        </p>
      </Section>

      <Section title="6. Premium subscriptions">
        <p>
          Inspire Premium is a paid subscription billed monthly or annually through our payment
          processor, Stripe. New subscriptions may include a free trial; unless you cancel before
          the trial ends, you'll be automatically charged the subscription price shown at checkout,
          and your subscription will automatically renew each billing period until you cancel.
        </p>
        <p>
          You can cancel anytime from the Premium page in your account — cancellation takes effect
          at the end of the current billing period, and we don't provide partial refunds for unused
          time except where required by law. We may change subscription pricing going forward, and
          will give you notice before a price change affects your renewal.
        </p>
      </Section>

      <Section title="7. Third-party services">
        <p>
          Inspire relies on third-party services to operate — including Stripe for payments,
          Cloudinary for storing photos and videos, Google for optional sign-in, and an AI
          provider for Aria. Your use of those features is also subject to those providers' own
          terms. See our <Link to="/privacy" className="text-indigo font-semibold hover:underline">Privacy Policy</Link> for details on what's shared with them.
        </p>
      </Section>

      <Section title="8. Intellectual property">
        <p>
          The Inspire name, logo, and branding are owned by us. These Terms don't grant you any
          rights to use them except as needed to use the Service normally (for example, seeing our
          logo in the app).
        </p>
      </Section>

      <Section title="9. Copyright complaints (DMCA)">
        <p>
          We respect intellectual property rights and respond to clear notices of alleged
          copyright infringement under the Digital Millennium Copyright Act (DMCA).
        </p>
        <p>
          <strong>To file a takedown notice</strong>, send our designated agent a written notice
          that includes: (1) a physical or electronic signature of the copyright owner or their
          authorized representative; (2) identification of the copyrighted work claimed to be
          infringed; (3) identification of the material you claim is infringing, with enough
          detail for us to locate it (a link is best); (4) your contact information (address,
          phone number, email); (5) a statement that you have a good-faith belief the use isn't
          authorized by the copyright owner, its agent, or the law; and (6) a statement, under
          penalty of perjury, that the information in the notice is accurate and that you're
          authorized to act on the copyright owner's behalf.
        </p>
        <p>
          <strong>Designated DMCA agent:</strong> DMCA Agent, Inspire · support@inspirerealexperiences.com
          <br />
          <span className="text-xs text-slate-light">(Registered with the U.S. Copyright Office's DMCA Designated Agent Directory.)</span>
        </p>
        <p>
          <strong>Counter-notification:</strong> if content you posted was removed and you believe
          that was a mistake, you can send our agent a counter-notice with your contact
          information, identification of the removed material and where it appeared, and a
          statement under penalty of perjury that you have a good-faith belief the material was
          removed by mistake or misidentification, plus your consent to the jurisdiction of the
          federal court in your district (or ours, if you're outside the US).
        </p>
        <p>
          <strong>Repeat infringers:</strong> we terminate the accounts of users who are
          repeat copyright infringers in appropriate circumstances.
        </p>
      </Section>

      <Section title="10. Termination">
        <p>
          You can delete your account anytime from Settings — this permanently removes your
          profile, posts, and activity. We may suspend or terminate your access if you violate
          these Terms, if we're required to by law, or if we discontinue the Service.
        </p>
      </Section>

      <Section title="11. Disclaimers">
        <p>
          Inspire is provided "as is" and "as available," without warranties of any kind, express
          or implied. We don't guarantee the Service will be uninterrupted, error-free, or secure.
          We're not responsible for content posted by other users, and we don't endorse it.
        </p>
      </Section>

      <Section title="12. Limitation of liability">
        <p>
          To the fullest extent permitted by law, Inspire and its founder won't be liable for any
          indirect, incidental, or consequential damages arising from your use of the Service. Our
          total liability for any claim relating to Inspire is limited to the amount you paid us,
          if any, in the 12 months before the claim arose.
        </p>
      </Section>

      <Section title="13. Governing law">
        <p>
          These Terms are governed by the laws of the United States and the state in which Inspire
          operates, without regard to conflict-of-law principles. Any dispute relating to these
          Terms or the Service will be resolved in the courts located there.
        </p>
      </Section>

      <Section title="14. Changes to these Terms">
        <p>
          We may update these Terms from time to time. If we make material changes, we'll let you
          know in the app before they take effect. Continuing to use Inspire after changes take
          effect means you accept the updated Terms.
        </p>
      </Section>

      <Section title="15. Contact">
        <p>
          Questions about these Terms? Reach us at{' '}
          <a href="mailto:support@inspirerealexperiences.com" className="text-indigo font-semibold hover:underline">
            support@inspirerealexperiences.com
          </a>.
        </p>
      </Section>

      <p className="text-xs text-slate-light border-t border-line pt-5 mt-10">
        This document is a plain-language template intended to reasonably reflect how Inspire
        actually works. It hasn't been reviewed by an attorney and isn't a substitute for legal
        advice specific to your business.
      </p>
    </div>
  )
}
