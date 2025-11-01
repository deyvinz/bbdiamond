import Link from 'next/link'
import { MotionText, MotionFadeIn, MotionSection } from '@/components/ui/motion'
import StoreNav from '@/components/StoreNav'

export const metadata = {
  title: 'Terms of Service - Luwāni',
  description: 'Terms of Service for Luwāni wedding website platform',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF6]">
      <StoreNav />
      
      <MotionSection className="pt-16 sm:pt-20 md:pt-24 pb-12 sm:pb-16 px-4">
        <div className="container max-w-4xl mx-auto">
          <MotionText delay={0.2}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold mb-6 text-[#1E1E1E] tracking-tight">
              Terms of Service
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
                <h2 className="text-2xl font-semibold text-[#1E1E1E] mb-4">1. Agreement to Terms</h2>
                <p className="mb-4">
                  By accessing or using Luwāni's wedding website platform, you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, then you may not access the service.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[#1E1E1E] mb-4">2. Description of Service</h2>
                <p className="mb-4">
                  Luwāni provides a platform for creating, managing, and hosting wedding websites. Our services include but are not limited to website templates, guest management, RSVP tracking, event scheduling, and related tools.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[#1E1E1E] mb-4">3. User Accounts</h2>
                <p className="mb-4">
                  To access certain features of our service, you must register for an account. You agree to:
                </p>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                  <li>Provide accurate, current, and complete information</li>
                  <li>Maintain and update your account information</li>
                  <li>Maintain the security of your password</li>
                  <li>Accept all responsibility for activities under your account</li>
                  <li>Notify us immediately of any unauthorized use</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[#1E1E1E] mb-4">4. Subscription Plans and Payments</h2>
                <h3 className="text-xl font-semibold text-[#1E1E1E] mb-3">4.1 Subscription Plans</h3>
                <p className="mb-4">
                  We offer various subscription plans with different features and pricing. Details of current plans are available on our pricing page.
                </p>

                <h3 className="text-xl font-semibold text-[#1E1E1E] mb-3 mt-6">4.2 Free Trial</h3>
                <p className="mb-4">
                  We may offer a free trial period. At the end of the trial period, your subscription will automatically convert to a paid plan unless you cancel before the trial ends.
                </p>

                <h3 className="text-xl font-semibold text-[#1E1E1E] mb-3 mt-6">4.3 Payments</h3>
                <p className="mb-4">
                  Subscription fees are billed in advance on a monthly or annual basis. All fees are non-refundable except as required by law or as otherwise stated.
                </p>

                <h3 className="text-xl font-semibold text-[#1E1E1E] mb-3 mt-6">4.4 Cancellation</h3>
                <p className="mb-4">
                  You may cancel your subscription at any time. Cancellation will take effect at the end of your current billing period. You will continue to have access to the service until the end of your paid period.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[#1E1E1E] mb-4">5. User Content</h2>
                <p className="mb-4">
                  You retain ownership of all content you upload to our platform. By uploading content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and distribute your content solely for the purpose of providing our services.
                </p>
                <p className="mb-4">
                  You are solely responsible for your content and agree not to upload content that:
                </p>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                  <li>Violates any laws or regulations</li>
                  <li>Infringes on intellectual property rights</li>
                  <li>Is offensive, harmful, or defamatory</li>
                  <li>Contains malware or viruses</li>
                  <li>Violates privacy rights of others</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[#1E1E1E] mb-4">6. Acceptable Use</h2>
                <p className="mb-4">You agree not to:</p>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                  <li>Use the service for any illegal purpose</li>
                  <li>Attempt to gain unauthorized access to our systems</li>
                  <li>Interfere with or disrupt the service</li>
                  <li>Use automated systems to access the service without permission</li>
                  <li>Resell or redistribute any part of our service</li>
                  <li>Reverse engineer or attempt to extract source code</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[#1E1E1E] mb-4">7. Intellectual Property</h2>
                <p className="mb-4">
                  The service and its original content, features, and functionality are owned by Luwāni and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[#1E1E1E] mb-4">8. Service Availability</h2>
                <p className="mb-4">
                  We strive to maintain high availability but do not guarantee uninterrupted access. We may temporarily suspend the service for maintenance, updates, or due to circumstances beyond our control. We are not liable for any losses resulting from service interruptions.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[#1E1E1E] mb-4">9. Limitation of Liability</h2>
                <p className="mb-4">
                  To the maximum extent permitted by law, Luwāni shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[#1E1E1E] mb-4">10. Indemnification</h2>
                <p className="mb-4">
                  You agree to indemnify and hold harmless Luwāni and its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses arising out of your use of the service or violation of these Terms.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[#1E1E1E] mb-4">11. Termination</h2>
                <p className="mb-4">
                  We may terminate or suspend your account and access to the service immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties, or for any other reason.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[#1E1E1E] mb-4">12. Changes to Terms</h2>
                <p className="mb-4">
                  We reserve the right to modify these Terms at any time. We will notify users of material changes via email or through the service. Your continued use of the service after such modifications constitutes acceptance of the updated Terms.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[#1E1E1E] mb-4">13. Governing Law</h2>
                <p className="mb-4">
                  These Terms shall be governed by and construed in accordance with [Your Jurisdiction] law, without regard to its conflict of law provisions.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-[#1E1E1E] mb-4">14. Contact Information</h2>
                <p className="mb-4">
                  If you have any questions about these Terms, please contact us:
                </p>
                <ul className="list-none mb-4 space-y-2">
                  <li><strong>Email:</strong> <a href="mailto:legal@luwani.com" className="text-[#C8A951] hover:underline">legal@luwani.com</a></li>
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

