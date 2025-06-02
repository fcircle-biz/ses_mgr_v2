FROM openjdk:17-jdk-slim

LABEL maintainer="SES Manager Team"

# Install required packages
RUN apt-get update && apt-get install -y \\
    curl \\
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy gradle wrapper and build files
COPY gradlew* ./
COPY gradle gradle
COPY build.gradle settings.gradle ./

# Copy source code
COPY src src

# Build application
RUN ./gradlew build -x test

# Copy built jar
RUN cp build/libs/*.jar app.jar

# Expose port
EXPOSE 8087

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \\
  CMD curl -f http://localhost:8087/actuator/health || exit 1

# Run application
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
