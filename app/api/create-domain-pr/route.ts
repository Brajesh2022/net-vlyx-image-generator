import { NextRequest, NextResponse } from "next/server"
import { Octokit } from "@octokit/rest"

const REPO_OWNER = "Brajesh2022"
const REPO_NAME = "Netvlyx"
const AUTHOR_EMAIL = "brajesh2022k@gmail.com"
const AUTHOR_NAME = "Brajesh Kumar"

// Files to update with their domain replacement patterns
const FILES_TO_UPDATE = [
  {
    path: "app/v/[...slug]/page.tsx",
    replacements: [
      { pattern: /https:\/\/vegamovise\.biz/g, type: "vegaBiz" },
    ],
  },
  {
    path: "app/api/scrape-vega/route.ts",
    replacements: [
      { pattern: /vegaA:\s*"https:\/\/vegamovise\.biz"/g, type: "vegaBiz", format: 'vegaA: "{value}"' },
      { pattern: /luxLike:\s*"https:\/\/www\.vegamovies-nl\.[^"]+"/g, type: "vegaNl", format: 'luxLike: "{value}"' },
    ],
  },
  {
    path: "app/vega-nl/[...slug]/page.tsx",
    replacements: [
      { pattern: /https:\/\/www\.vegamovies-nl\.[^"]+/g, type: "vegaNl" },
    ],
  },
  {
    path: "app/view-all/page.tsx",
    replacements: [
      { pattern: /https:\/\/www\.vegamovies-nl\.[^"]+\//g, type: "vegaNl", keepTrailingSlash: true },
    ],
  },
  {
    path: "components/category-row.tsx",
    replacements: [
      { pattern: /https:\/\/www\.vegamovies-nl\.[^"]+\//g, type: "vegaNl", keepTrailingSlash: true },
    ],
  },
  {
    path: "app/page.tsx",
    replacements: [
      { pattern: /https:\/\/www\.vegamovies-nl\.[^"]+\//g, type: "vegaNl", keepTrailingSlash: true },
    ],
  },
  {
    path: "app/category/page.tsx",
    replacements: [
      { pattern: /https:\/\/www\.vegamovies-nl\.[^"]+\//g, type: "vegaNl", keepTrailingSlash: true },
    ],
  },
  {
    path: "app/api/scrape/route.ts",
    replacements: [
      { pattern: /const BASE_URL = "https:\/\/www\.vegamovies-nl\.[^"]+\//g, type: "vegaNl", format: 'const BASE_URL = "{value}/"' },
      { pattern: /https:\/\/www\.vegamovies-nl\.[^"]+\//g, type: "vegaNl", keepTrailingSlash: true },
    ],
  },
  {
    path: "app/api/category/latest/route.ts",
    replacements: [
      { pattern: /const BASE_URL = "https:\/\/www\.vegamovies-nl\.[^"]+\//g, type: "vegaNl", format: 'const BASE_URL = "{value}/"' },
    ],
  },
  {
    path: "app/api/category/[category]/route.ts",
    replacements: [
      { pattern: /https:\/\/www\.vegamovies-nl\.[^"]+\//g, type: "vegaNl", keepTrailingSlash: true },
    ],
  },
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { githubToken, vegaBizDomain, vegaNlDomain } = body

    if (!githubToken || !vegaBizDomain || !vegaNlDomain) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Initialize Octokit with user's token
    const octokit = new Octokit({ auth: githubToken })

    // Verify token and get user info
    let authenticatedUser
    try {
      const { data: user } = await octokit.users.getAuthenticated()
      authenticatedUser = user.login
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid GitHub token" },
        { status: 401 }
      )
    }

    // Get the default branch and latest commit SHA
    const { data: repo } = await octokit.repos.get({
      owner: REPO_OWNER,
      repo: REPO_NAME,
    })
    const defaultBranch = repo.default_branch

    const { data: refData } = await octokit.git.getRef({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: `heads/${defaultBranch}`,
    })
    const latestCommitSha = refData.object.sha

    // Create a new branch
    const timestamp = Date.now()
    const branchName = `update-domains-${timestamp}`
    
    await octokit.git.createRef({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: `refs/heads/${branchName}`,
      sha: latestCommitSha,
    })

    // Update files
    const fileUpdates = []
    
    for (const fileConfig of FILES_TO_UPDATE) {
      try {
        // Get current file content
        const { data: fileData } = await octokit.repos.getContent({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          path: fileConfig.path,
          ref: branchName,
        })

        if ("content" in fileData) {
          const currentContent = Buffer.from(fileData.content, "base64").toString("utf-8")
          let updatedContent = currentContent

          // Apply all replacements for this file
          for (const replacement of fileConfig.replacements) {
            const domainValue = replacement.type === "vegaBiz" ? vegaBizDomain : vegaNlDomain
            
            if (replacement.format) {
              // Use custom format string
              const newValue = replacement.format.replace("{value}", domainValue)
              updatedContent = updatedContent.replace(replacement.pattern, newValue)
            } else {
              // Simple replacement
              let replacementValue = domainValue
              if (replacement.keepTrailingSlash && !replacementValue.endsWith("/")) {
                replacementValue += "/"
              }
              updatedContent = updatedContent.replace(replacement.pattern, replacementValue)
            }
          }

          // Only update if content changed
          if (updatedContent !== currentContent) {
            await octokit.repos.createOrUpdateFileContents({
              owner: REPO_OWNER,
              repo: REPO_NAME,
              path: fileConfig.path,
              message: `Update domain in ${fileConfig.path}`,
              content: Buffer.from(updatedContent).toString("base64"),
              branch: branchName,
              sha: fileData.sha,
              author: {
                name: AUTHOR_NAME,
                email: AUTHOR_EMAIL,
              },
              committer: {
                name: AUTHOR_NAME,
                email: AUTHOR_EMAIL,
              },
            })

            fileUpdates.push(fileConfig.path)
          }
        }
      } catch (error: any) {
        console.error(`Error updating ${fileConfig.path}:`, error.message)
        // Continue with other files even if one fails
      }
    }

    if (fileUpdates.length === 0) {
      return NextResponse.json(
        { error: "No files were updated. Domains may already be up to date." },
        { status: 400 }
      )
    }

    // Create pull request
    const { data: pr } = await octokit.pulls.create({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      title: "🔄 Update VegaMovies Domains",
      head: branchName,
      base: defaultBranch,
      body: `## Domain Updates

This PR updates the VegaMovies domains across the codebase.

### Changes:
- **VegaBiz Domain:** \`${vegaBizDomain}\`
- **VegaNL Domain:** \`${vegaNlDomain}\`

### Files Updated (${fileUpdates.length}):
${fileUpdates.map((file) => `- \`${file}\``).join("\n")}

### Author:
- Created by: @${authenticatedUser}
- Committed as: ${AUTHOR_NAME} <${AUTHOR_EMAIL}>

---
*This PR was automatically created via the domain management tool.*`,
    })

    return NextResponse.json({
      success: true,
      prUrl: pr.html_url,
      branchName,
      filesUpdated: fileUpdates.length,
      updatedFiles: fileUpdates,
    })
  } catch (error: any) {
    console.error("Error creating PR:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create pull request" },
      { status: 500 }
    )
  }
}
