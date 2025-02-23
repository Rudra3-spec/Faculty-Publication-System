import { Publication } from "@shared/schema";

interface Summary {
  content: Buffer;
  contentType: string;
  extension: string;
}

export async function generatePublicationSummary(
  publications: Publication[],
  format: string,
  filter: string
): Promise<Summary> {
  // Group publications based on filter
  const grouped = groupPublications(publications, filter);
  
  // Generate content based on format
  switch (format.toLowerCase()) {
    case "pdf":
      return generatePDFSummary(grouped);
    case "word":
      return generateWordSummary(grouped);
    case "web":
      return generateWebSummary(grouped);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

function groupPublications(publications: Publication[], filter: string) {
  const groups = new Map<string, Publication[]>();

  publications.forEach(pub => {
    let key: string;
    switch (filter) {
      case "year":
        key = pub.year.toString();
        break;
      case "type":
        key = pub.type;
        break;
      case "area":
        key = pub.researchArea || "Uncategorized";
        break;
      default:
        key = "All Publications";
    }

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(pub);
  });

  // Sort groups by key (year in reverse order, others alphabetically)
  const sorted = new Map([...groups.entries()].sort((a, b) => {
    if (filter === "year") {
      return parseInt(b[0]) - parseInt(a[0]);
    }
    return a[0].localeCompare(b[0]);
  }));

  return sorted;
}

async function generatePDFSummary(grouped: Map<string, Publication[]>): Promise<Summary> {
  // TODO: Implement PDF generation
  // For now, return a simple text representation
  const content = formatSummaryText(grouped);
  
  return {
    content: Buffer.from(content),
    contentType: "application/pdf",
    extension: "pdf"
  };
}

async function generateWordSummary(grouped: Map<string, Publication[]>): Promise<Summary> {
  // TODO: Implement Word document generation
  // For now, return a simple text representation
  const content = formatSummaryText(grouped);
  
  return {
    content: Buffer.from(content),
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extension: "docx"
  };
}

async function generateWebSummary(grouped: Map<string, Publication[]>): Promise<Summary> {
  const content = generateHTML(grouped);
  
  return {
    content: Buffer.from(content),
    contentType: "text/html",
    extension: "html"
  };
}

function formatSummaryText(grouped: Map<string, Publication[]>): string {
  let text = "Publications Summary\n\n";

  for (const [group, publications] of grouped) {
    text += `${group}\n${"-".repeat(group.length)}\n\n`;
    
    publications.forEach(pub => {
      text += `${pub.title}\n`;
      text += `Authors: ${pub.authors}\n`;
      text += `${pub.venue}, ${pub.year}\n`;
      if (pub.doi) text += `DOI: ${pub.doi}\n`;
      text += "\n";
    });
  }

  return text;
}

function generateHTML(grouped: Map<string, Publication[]>): string {
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Publications Summary</title>
      <style>
        body { font-family: system-ui; max-width: 800px; margin: 2rem auto; padding: 0 1rem; }
        h1 { color: #1a365d; }
        h2 { color: #2c5282; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; }
        .publication { margin-bottom: 1.5rem; }
        .title { font-weight: bold; margin-bottom: 0.5rem; }
        .metadata { color: #4a5568; }
        .doi { color: #2b6cb0; text-decoration: none; }
        .doi:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <h1>Publications Summary</h1>
  `;

  for (const [group, publications] of grouped) {
    html += `<h2>${group}</h2>`;
    
    publications.forEach(pub => {
      html += `
        <div class="publication">
          <div class="title">${pub.title}</div>
          <div class="metadata">
            ${pub.authors}<br>
            ${pub.venue}, ${pub.year}
            ${pub.doi ? `<br><a href="https://doi.org/${pub.doi}" class="doi">DOI: ${pub.doi}</a>` : ""}
          </div>
        </div>
      `;
    });
  }

  html += `
    </body>
    </html>
  `;

  return html;
}
