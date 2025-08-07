import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage } from "@/components/ui/breadcrumb";
const AboutPage = () => {
  return <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbPage>About</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">About Ikhaya Homeware</h1>
          
          <div className="prose max-w-none">
            <p className="text-lg mb-6">
              Welcome to Ikhaya Homeware, where we believe that every house should feel like home. 
              "Ikhaya" means "home" in isiZulu, reflecting our commitment to bringing warmth, 
              comfort, and style to South African homes.
            </p>
            
            <h2 className="text-2xl font-semibold mb-4">Our Story</h2>
            <p className="mb-6">Founded with a passion for beautiful living spaces, Ikhaya Homeware curates a carefully selected collection of home essentials that blend functionality with aesthetic appeal. From kitchen essentials to bedroom comfort, we offer everything you need to create spaces that truly feel like home. Proudly by OZZ Cash and Carry</p>
            
            <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
            <p className="mb-6">
              To make quality homeware accessible to every South African family, whether you're 
              furnishing your first apartment or renovating your dream home. We believe that 
              beautiful, functional home goods shouldn't be a luxury – they should be part of 
              everyday life.
            </p>
            
            <h2 className="text-2xl font-semibold mb-4">What We Offer</h2>
            <ul className="list-disc pl-6 mb-6">
              <li>Kitchen & Dining essentials for every meal</li>
              <li>Living Room furniture and decor</li>
              <li>Bedroom comfort and style</li>
              <li>Bathroom accessories and storage</li>
              <li>Home decor and lighting</li>
              <li>Storage and organization solutions</li>
            </ul>
            
            <h2 className="text-2xl font-semibold mb-4">Quality Promise</h2>
            <p className="mb-6">
              Every product in our collection is chosen for its quality, durability, and design. 
              We work with trusted suppliers to ensure that when you shop with Ikhaya Homeware, 
              you're investing in items that will serve your home for years to come.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>;
};
export default AboutPage;