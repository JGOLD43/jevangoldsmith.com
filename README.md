# Jevan Goldsmith - Personal Website

A clean, modern personal website built with pure HTML and CSS. No frameworks, no build process—just straightforward code.

## Features

- **Responsive Design**: Works beautifully on desktop, tablet, and mobile devices
- **Clean Typography**: Uses Inter and Merriweather fonts for a professional, readable design
- **Fast Loading**: No heavy frameworks means quick page loads
- **Easy to Customize**: Simple HTML/CSS structure makes it easy to modify

## Pages

- **Home** (`index.html`): Introduction, bio, and recent activity
- **Essays** (`essays.html`): Blog posts and long-form writing
- **Book Reviews** (`books.html`): Reviews of books you've read
- **Movie Reviews** (`movies.html`): Automatically pulls your recent movie reviews from Letterboxd via RSS feed
- **About** (`about.html`): More detailed background and interests
- **Contact** (`contact.html`): Contact form and social media links

## Setup

1. **Update Social Media Links**: Replace `yourusername` in all HTML files with your actual social media handles:
   - X (Twitter): Search for `https://x.com/yourusername`
   - Facebook: Search for `https://facebook.com/yourusername`
   - Letterboxd: Search for `https://letterboxd.com/yourusername`
   - LinkedIn: Search for `https://linkedin.com/in/yourusername`

2. **Add Your Profile Image**: Replace the placeholder in `index.html`:
   - Add your profile image to the `images/` folder (e.g., `images/profile.jpg`)
   - The current reference is: `<img src="images/profile.jpg" alt="Jevan Goldsmith">`

3. **Setup Contact Form**: The contact form uses Formspree (free service):
   - Go to [formspree.io](https://formspree.io) and create a free account
   - Create a new form and get your form ID
   - In `contact.html`, replace `your-form-id` with your actual Formspree form ID

4. **Customize Content**:
   - Update the essays in `essays.html` with your actual writing
   - Update the book reviews in `books.html` with books you've actually read
   - Modify the About page with your personal background
   - Add real book cover images if desired (replace the gradient placeholders)

## Deployment Options

### Option 1: GitHub Pages (Free & Easy)
1. Create a GitHub repository
2. Upload all files to the repository
3. Go to Settings > Pages
4. Select "Deploy from branch" and choose your main branch
5. Your site will be live at `https://yourusername.github.io/repository-name`

### Option 2: Netlify (Free & Simple)
1. Sign up at [netlify.com](https://netlify.com)
2. Drag and drop the `personal-website` folder into Netlify
3. Your site will be live instantly with a custom URL
4. You can add a custom domain if you have one

### Option 3: Vercel (Free)
1. Sign up at [vercel.com](https://vercel.com)
2. Import your project from GitHub or upload directly
3. Deploy with one click

### Option 4: Traditional Web Hosting
1. Upload all files to your web host via FTP
2. Make sure `index.html` is in the root directory
3. Your site will be accessible at your domain

## Customization

### Colors
Edit the CSS variables in `css/style.css` to change the color scheme:

```css
:root {
    --primary-color: #2c3e50;      /* Main heading color */
    --secondary-color: #3498db;     /* Links and buttons */
    --accent-color: #e74c3c;        /* Hover states */
    --text-color: #333;             /* Body text */
    --text-light: #666;             /* Secondary text */
}
```

### Fonts
The site uses Google Fonts (Inter and Merriweather). To change fonts:
1. Visit [fonts.google.com](https://fonts.google.com)
2. Select your desired fonts
3. Replace the font links in the `<head>` of each HTML file
4. Update the font-family in `css/style.css`

### Layout
All styling is in `css/style.css`. The site uses CSS Grid and Flexbox for layouts, making it easy to modify.

## File Structure

```
personal-website/
├── index.html          # Home page
├── essays.html         # Essays/blog page
├── books.html          # Book reviews page
├── movies.html         # Movie reviews page (Letterboxd integration)
├── about.html          # About page
├── contact.html        # Contact page
├── README.md           # This file
├── css/
│   └── style.css       # All styles
├── js/
│   └── letterboxd.js   # Letterboxd RSS feed integration
└── images/
    └── profile.jpg     # Your profile image (you need to add this)
```

## Browser Support

Works on all modern browsers:
- Chrome, Firefox, Safari, Edge (latest versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

Feel free to use this template for your own personal website. No attribution required.

## Questions?

If you need help customizing or deploying your site, feel free to reach out!