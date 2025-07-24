const fetch = require('node-fetch');

// These are set in the Netlify UI, not here.
const { GITHUB_TOKEN, GITHUB_REPO, GITHUB_USER_NAME, GITHUB_USER_EMAIL } = process.env;
const API_URL = `https://api.github.com/repos/${GITHUB_REPO}/contents/index.html`;

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { heroSlides } = JSON.parse(event.body);
        if (!heroSlides) {
            return { statusCode: 400, body: 'Missing heroSlides data' };
        }

        // 1. Get the current file content and its SHA hash from GitHub
        const getFileResponse = await fetch(API_URL, {
            headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
        });
        if (!getFileResponse.ok) throw new Error(`Failed to fetch file from GitHub: ${getFileResponse.statusText}`);
        const fileData = await getFileResponse.json();
        const currentContent = Buffer.from(fileData.content, 'base64').toString('utf8');
        const currentSha = fileData.sha;

        // 2. Prepare the new content for the heroSlides array
        const newSlidesContent = `let heroSlides = ${JSON.stringify(heroSlides, null, 4)};`;

        // 3. Replace the old heroSlides array with the new one in the file content
        const updatedContent = currentContent.replace(/let heroSlides = \[[\s\S]*?\];/, newSlidesContent);
        const encodedContent = Buffer.from(updatedContent).toString('base64');

        // 4. Commit the updated file to GitHub
        const commitResponse = await fetch(API_URL, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'feat: Update hero slides via admin panel',
                content: encodedContent,
                sha: currentSha, // IMPORTANT: The SHA of the file you are replacing
                committer: {
                    name: GITHUB_USER_NAME,
                    email: GITHUB_USER_EMAIL
                }
            })
        });

        if (!commitResponse.ok) throw new Error(`Failed to commit file to GitHub: ${commitResponse.statusText}`);

        return { statusCode: 200, body: JSON.stringify({ message: 'Website update initiated successfully!' }) };

    } catch (error) {
        console.error('Error:', error);
        return { statusCode: 500, body: JSON.stringify({ message: `Error: ${error.message}` }) };
    }
};
