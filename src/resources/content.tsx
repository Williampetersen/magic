import { About, Blog, Gallery, Home, Newsletter, Person, Social, Work, Page  } from "@/types";
import { Line, Row, Text } from "@once-ui-system/core";

const person: Person = {
  firstName: "William",
  lastName: "Petersen",
  name: `William Petersen`,
  role: "Google Partner in Denmark,        Microsoft Engineer, ",
  avatar: "/images/william.png",
  email: "Williampetersencop@gmail.com",
  location: "Europe/Copenhagen", // Expecting the IANA time zone identifier, e.g., 'Europe/Vienna'
  languages: ["English", "Danish"], // optional: Leave the array empty if you don't want to display languages
};
const price = {
  path: "/price",
  label: "Pricing",
  title: `Pricing – ${person.name}`,
  description: `Pricing plans and service packages by ${person.name}.`,
};


const newsletter: Newsletter = {
  display: true,
  title: <>Subscribe to {person.firstName}'s Newsletter</>,
  description: <>My weekly newsletter about creativity and engineering</>,
};

const social: Social = [
  // Links are automatically displayed.
  // Import new icons in /once-ui/icons.ts
  // Set essentials: true for links you want to show on the about page
  {
    name: "GitHub",
    icon: "GitHub",
    link: "https://github.com/Williampetersen",
    essential: true,
  },
  {
    name: "LinkedIn",
    icon: "linkedin",
    link: "https://www.linkedin.com/in/william-petersen-a79965190/",
    essential: true,
  },
  {
    name: "Instagram",
    icon: "instagram",
    link: "https://www.instagram.com/william.ptsn/",
    essential: false,
  },
  {
    name: "Email",
    icon: "email",
    link: `mailto:${person.email}`,
    essential: true,
  },
];

const home: Home = {
  path: "/",
  image: "/images/og/home.jpg",
  label: "Home",
  title: `${person.name}'s Portfolio`,
  description: `Portfolio website showcasing my work as a ${person.role}`,
  headline: <>Boost Your Brand with Trust Web Ads</>,
  featured: {
    display: true,
    title: (
      <Row gap="12" vertical="center">
        <strong className="ml-4">Once UI</strong>{" "}
        <Line background="brand-alpha-strong" vert height="20" />
        <Text marginRight="4" onBackground="brand-medium">
          Featured work
        </Text>
      </Row>
    ),
    href: "Boost Your Brand with Trust Web Ads",
  },
  subline: (
    <>
    I'm William, a design engineer at <Text as="span" size="xl" weight="strong">Trust Web Ads</Text>, where I craft intuitive <br /> user experiences.
</>
  ),
};

const about: About = {
  path: "/about",
  label: "About",
  title: `About – ${person.name}`,
  description: `Meet ${person.name}, ${person.role} from ${person.location}`,
  tableOfContent: {
    display: true,
    subItems: false,
  },
  avatar: {
    display: true,
  },
  calendar: {
    display: true,
    link: "https://cal.com",
  },
  intro: {
    display: true,
    title: "Introduction",
    description: (
      <>
        William Petersen is a Copenhagen-based web and technology specialist with a strong focus on 
        building clean, efficient, and scalable digital solutions. His work spans website management, 
        Google Ads, and Microsoft Power Platform, combining technical expertise with practical business needs 
        to deliver reliable and high-performing digital experiences.
      </>
    ),
  },
  work: {
    display: true, // set to false to hide this section
    title: "Work Experience",
    experiences: [
      {
        company: "Visit Frederiksberg",
        timeframe: "2017 - Present",
        role: "Developer and Admin",
        achievements: [
          <>
            Redesigned the UI/UX for the Visit Frederiksberg platform, resulting in a 20% increase in user
            engagement and 30% faster load times.
          </>,
          <>
            Managed and maintained the website, kept content updated, handled news & events.
          </>,
        ],
        images: [
          // optional: leave the array empty if you don't want to display images
          {
            src: "/images/projects/project-01/cover-01.jpg",
            alt: "Visit Frederiksberg",
            width: 16,
            height: 9,
          },
        ],
      },
      {
        company: "CC Copenhagen",
        timeframe: "2020 – Present",
        role: "Microsoft Power Platform",
        achievements: [
          <>
            Developed a design system that unified the brand across multiple platforms, improving
            design consistency by 40%.
          </>,
          <>
            Started learning Power Platform there and now work remotely with the same company.
          </>,
        ],
        images: [],
      },
    ],
  },
  studies: {
    display: true, // set to false to hide this section
    title: "Certificate",
    institutions: [
      {
        name: "Bachelor of Science (BSc) in Computer Engineering",
        description: <>DTU (Technical University of Denmark</>,
      },
      
      {
  name: "Microsoft Power Platform)",
  description: (
    <>


      <p>Washington DC - USA - 2024 - MS Certificate.</p>


      <img
        src="/images/projects/project-01/ms.png"
        alt="DTU - Technical University of Denmark"
        style={{ marginTop: 12, maxWidth: 300 }}
      />
    </>
  ),
},
    
    ],
  },
  technical: {
    display: true, // set to false to hide this section
    title: "Technical skills",
    skills: [
      {
        title: "Google Marketing",
        description: (
          <>Google Ads, Email Marketing + Meta</>
        ),
        tags: [
          {
            name: "Google Marketing",
            icon: "Google",
          },
        ],
        // optional: leave the array empty if you don't want to display images
        images: [
          {
            src: "/images/projects/project-01/cover-02.jpg",
            alt: "Project image",
            width: 16,
            height: 9,
          },
          {
            src: "/images/projects/project-01/cover-03.jpg",
            alt: "Project image",
            width: 16,
            height: 9,
          },
        ],
      },
      {
        title: "Next.js",
        description: (
          <>Building next gen apps with Next.js + Once UI + Supabase.</>
        ),
        tags: [
          {
            name: "JavaScript",
            icon: "javascript",
          },
          {
            name: "Next.js",
            icon: "nextjs",
          },
          {
            name: "Supabase",
            icon: "supabase",
          },
        ],
        // optional: leave the array empty if you don't want to display images
        images: [
          {
            src: "/images/projects/project-01/cover-04.jpg",
            alt: "Project image",
            width: 16,
            height: 9,
          },
        ],
      },
    ],
  },
};

const blog: Blog = {
  path: "/blog",
  label: "Blog",
  title: "Writing about design and tech...",
  description: `Read what ${person.name} has been up to recently`,
  // Create new blog posts by adding a new .mdx file to app/blog/posts
  // All posts will be listed on the /blog route
};

const work: Work = {
  path: "/work",
  label: "Work",
  title: `Projects – ${person.name}`,
  description: `Design and dev projects by ${person.name}`,
  // Create new project pages by adding a new .mdx file to app/blog/posts
  // All projects will be listed on the /home and /work routes
};

const gallery: Gallery = {
  path: "/gallery",
  label: "Gallery",
  title: `Photo gallery – ${person.name}`,
  description: `A photo collection by ${person.name}`,
  // Images by https://lorant.one
  // These are placeholder images, replace with your own
  images: [
    {
      src: "/images/gallery/horizontal-1.jpg",
      alt: "image",
      orientation: "horizontal",
    },
    {
      src: "/images/gallery/vertical-4.jpg",
      alt: "image",
      orientation: "vertical",
    },
    {
      src: "/images/gallery/horizontal-3.jpg",
      alt: "image",
      orientation: "horizontal",
    },
    {
      src: "/images/gallery/vertical-1.jpg",
      alt: "image",
      orientation: "vertical",
    },
    {
      src: "/images/gallery/vertical-2.jpg",
      alt: "image",
      orientation: "vertical",
    },
    {
      src: "/images/gallery/horizontal-2.jpg",
      alt: "image",
      orientation: "horizontal",
    },
    {
      src: "/images/gallery/horizontal-4.jpg",
      alt: "image",
      orientation: "horizontal",
    },
    {
      src: "/images/gallery/vertical-3.jpg",
      alt: "image",
      orientation: "vertical",
    },
  ],
};

export { person, social, newsletter, home, about, blog, work, gallery, price };
