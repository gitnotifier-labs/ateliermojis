# How we ended up here (with a lot of AI, Agents and all the buzz words)

## Starting with failures

I first tried generating a basic project with a Next.js starter template, then told my agent the design I wanted for the MVP. But it just wasn't working. After several tries (for at least, I don't know, 20 minutes) it was going no where so I realized I should probably start over.

Then I considered TanStack, because this project doesn't need server-side rendering at all. And we don't really care about SEO here.

But I failed there too. Badly. Then somewhere in the docs, I read about v0, Vercel's project to quickly generate a new site.

Well, it couldn't even generate the page preview properly, so: failure again.

Then I remembered [Lovable](lovable.dev), the cool shiny startup that helps you build websites. And honestly, it worked on the first try with a super simple prompt.

This was my prompt with Lovable:

```txt
I am building a slack emoji creator.

People will upload a local picture and my website will make it less 128KB, 128x128 and squared.

I need light/dark theme based on system.

Colorful colors based on slack colors.

https://mobbin.com/colors/brand/slack

Joyful theme. Single landing page. Simple.

Using Shadcn and tailwind v4.

In the future it will support animate these pics and show different possible animation. But also support gif (for now, just disable these but show it's coming soon)
```

And it escalated super quickly into a brand-new, shiny, beautiful version in 5min. I was honestly impressed.

## Going away from the out-of-the-box new website

But then I wanted full customization and a brand-new standard setup, so I saved it to a GitHub repository, opened opencode, and jumped into tmux.

Honestly, you can just check the commit history. It's pretty self-explanatory on what happened next,

### Feel like home

The first thing I really changed was making it AI-ready. I added a bunch of skills (shadcn, git-commit and mouse-effect) using skills.sh and made sure we had `@AGENTS.md` and a good `README`.

Then I started tweaking the repo the way I wanted. First: PNPM (for reasons). Lovable had created it with NPM with `package-lock.json`, but there was also an old `bun.lockb` and a `bun.lock`, so it was kind of weird.

Once I migrated to PNPM, I cleaned up everything Lovable created but didn't use: unused components, unused dependencies, all that.

For tooling, I removed ESLint and moved to OXC (`oxlint` + `oxfmt`) for speed (honestly, don't do this on such a small project).

Then, very important: I added a CI workflow file. AI is pretty bad at generating state-of-the-art CI files, so I had to tweak it a bit to automatically read the package manager version from `package.json` and combine that with the Node version from `.nvmrc`.

This matters because I often use AI in small batches of changes, so CI helps us catch when we (the agent lol) break something.

Then I went on a rampage upgrading a bunch of packages, because AI often uses outdated versions. I had to upgrade Vite, React, Tailwind, and others.

I also generated a bunch of basic docs: `@CONTRIBUTING.md`, `@SECURITY.md`, and `@CODE_OF_CONDUCT.md` as the repo is meant to be open-source. Worth noting: I added a section in CONTRIBUTING to make sure automated pull requests get tagged. I got that idea from a blog post I read last week.

Now I'm pretty happy with the current state and can go back to building features.

## Features

Super basic for now. Just using the Plan -> Build capabilities with opencode.
