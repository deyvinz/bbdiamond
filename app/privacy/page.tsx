import Link from 'next/link'
import { MotionText, MotionFadeIn, MotionSection } from '@/components/ui/motion'
import StoreNav from '@/components/StoreNav'

export const metadata = {
  title: 'Privacy Policy - Luwāni',
  description: 'Privacy Policy for Luwāni wedding website platform',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF6]">
      <StoreNav />
      
      <MotionSection className="pt-16 sm:pt-20 md:pt-24 pb-12 sm:pb-16 px-4">
        <div className="container max-w-4xl mx-auto">
          <MotionText delay={0.2}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold mb-6 text-[#1E1E1E] tracking-tight">
              Privacy Policy
            </h1>
          </MotionText>
          <MotionText delay={0.3}>
            <p className="text-lg text-[#1E1E1E]/70 mb-4">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </MotionText>

          <MotionFadeIn delay={0.4} direction="up">
            <div className="prose prose-lg max-w-none mt-8 space-y-8 text-[#1E1E1E]/80">
              <section>
                <h2 className="text-2xl font-semibold text-[#1E1E1E] mb-4">1. Introduction</h2>
                <p className="mb-4">
                  Welcome to Luwāni. We are committed to protecting your privacy and ensuring you have a positive experience on our website and in using our products and services. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our wedding website platform.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[#1E1E1E] mb-4">2. Information We Collect</h2>
                <h3 className="text-xl font-semibold text-[#1E1E1E] mb-3">2.1 Information You Provide</h3>
                <p className="mb-4">
                  We collect information that you provide directly to us, including:
                </p>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                  <li>Account information (name, email address, password)</li>
                  <li>Wedding details (couple names, dates, locations, guest information)</li>
                  <li>Payment information (processed securely through third-party providers)</li>
                  <li>Content you upload (photos, text, RSVP information)</li>
                  <li>Communications with us (support requests, feedback)</li>
                </ul>

                <h3 className="text-xl font-semibold text-[#1E1E1E] mb-3 mt-6">2.2 Automatically Collected Information</h3>
                <p className="mb-4">
                  We automatically collect certain information when you use our service:
                </p>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                  <li>Device information (IP address, browser type, operating system)</li>
                  <li>Usage data (pages visited, features used, time spent)</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[#1E1E1E] mb-4">3. How We Use Your Information</h2>
                <p className="mb-4">We use the information we collect to:</p>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                  <li>Provide, maintain, and improve our services</li>
                  <li>Process transactions and send related information</li>
                  <li>Send you technical notices, updates, and support messages</li>
                  <li>Respond to your comments, questions, and requests</li>
                  <li>Monitor and analyze trends and usage</li>
                  <li>Detect, prevent, and address technical issues</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[#1E1E1E] mb-4">4. Information Sharing and Disclosure</h2>
                <p className="mb-4">
                  We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
                </p>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                  <li><strong>Service Providers:</strong> With trusted third-party service providers who assist us in operating our platform</li>
                  <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                  <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                  <li><strong>With Your Consent:</strong> When you explicitly authorize us to share your information</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[#1E1E1E] mb-4">5. Data Security</h2>
                <p className="mb-4">
                  We implement appropriate technical and organizational security measures to protect your personal information. However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[#1E1E1E] mb-4">6. Your Rights and Choices</h2>
                <p className="mb-4">You have the right to:</p>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                  <li>Access and receive a copy of your personal data</li>
                  <li>Rectify inaccurate or incomplete data</li>
                  <li>Request deletion of your personal data</li>
                  <li>Object to or restrict processing of your data</li>
                  <li>Data portability</li>
                  <li>Withdraw consent at any time</li>
                </ul>
                <p className="mb-4">
                  To exercise these rights, please contact us at <a href="mailto:privacy@luwani.com" className="text-[#C8A951] hover:underline">privacy@luwani.com</a>.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[#1E1E1E] mb-4">7. Cookies and Tracking Technologies</h2>
                <p className="mb-4">
                  We use cookies and similar tracking technologies to track activity on our service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our service.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[#1E1E1E] mb-4">8. Third-Party Services</h2>
                <p className="mb-4">
                  Our service may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to read their privacy policies.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[#1E1E1E] mb-4">9. Children's Privacy</h2>
                <p className="mb-4">
                  Our service is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[#1E1E1E] mb-4">10. Changes to This Privacy Policy</h2>
                <p className="mb-4">
                  We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[#1E1E1E] mb-4">11. Contact Us</h2>
                <p className="mb-4">
                  If you have any questions about this Privacy Policy, please contact us:
                </p>
                <ul className="list-none mb-4 space-y-2">
                  <li><strong>Email:</strong> <a href="mailto:privacy@luwani.com" className="text-[#C8A951] hover:underline">privacy@luwani.com</a></li>
                  <li><strong>Address:</strong> [Your Business Address]</li>
                </ul>
              </section>
            </div>
          </MotionFadeIn>
        </div>
      </MotionSection>

      {/* Footer */}
      <footer className="border-t bg-white/70 backdrop-blur py-8 sm:py-10 mt-12 sm:mt-16 md:mt-20">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center text-sm text-[#1E1E1E]/60">
            <p>© {new Date().getFullYear()} Luwāni. Made with ❤️</p>
            <div className="mt-4 space-x-4">
              <Link href="/privacy" className="hover:text-[#C8A951] transition-colors">Privacy Policy</Link>
              <span>•</span>
              <Link href="/terms" className="hover:text-[#C8A951] transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

