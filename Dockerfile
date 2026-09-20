FROM openjdk:17-jdk-slim

WORKDIR /app

# Copy project files
COPY lib/ lib/
COPY src/ src/
COPY web/ web/
COPY database/ database/

# Compile Java sources
RUN mkdir -p bin && javac -cp ".:lib/*" -d bin src/*.java

# Expose default port
ENV PORT=8080
EXPOSE 8080

# Launch WebServer
CMD ["java", "-cp", "bin:lib/*", "WebServer"]
