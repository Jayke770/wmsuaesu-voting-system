FROM node:14-slim
USER root
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* 
RUN npm init -y &&  \
    npm i puppeteer \
    # Add user so we don't need --no-sandbox.
    # same layer as npm install to keep re-chowned files from using up several hundred MBs more space
    && groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /node_modules \
    && chown -R pptruser:pptruser /package.json \
    && chown -R pptruser:pptruser /package-lock.json
# Google fonts
RUN wget https://github.com/google/fonts/archive/main.tar.gz -O gf.tar.gz
RUN tar -xf gf.tar.gz
RUN mkdir -p /usr/share/fonts/truetype/google-fonts
RUN find $PWD/fonts-main/ -name "*.ttf" -exec install -m644 {} /usr/share/fonts/truetype/google-fonts/ \; || return 1
RUN rm -f gf.tar.gz
RUN fc-cache -f && rm -rf /var/cache/*
WORKDIR /app
COPY ["package.json", "package-lock.json*", "./"]
RUN npm install
COPY . .
RUN npm run build
ENV NODE_ENV=production
ENV PORT=8989 
ENV link=https://8000-blue-wren-49tiikb7.ws-us18.gitpod.io/
ENV maillink=https://8000-blue-wren-49tiikb7.ws-us18.gitpod.io/
ENV admin_username=wmsuadmin
ENV admin_password=password1434!
ENV db_url=mongodb+srv://jayke-mongodb:Jakevelasco1434!@thesis.xz8wf.mongodb.net/wmsu-voting?retryWrites=true&w=majority
ENV email=votingsystem1434@gmail.com
ENV emailpassword=Jakevelasco1434!
ENV emailservice=gmail
ENV session_secret=jdjdjdbdbdjjdsjsjskskkskw26626272783848rjdbbznskaoaasbsbdxxoaqlkaqowo3746466448392o2okwjdbdnndkaoaoabbssbdbjxjxjdbbdbdiwjwu26363638hdbsb
EXPOSE 8989
CMD ["npm", "run", "dev"]