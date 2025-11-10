import { logger } from "react-native-logs";

// Pick up environment or fall back to default development boolean declared by React Native (__DEV__ true in dev, false in prod)
const logLevel =
	process.env.EXPO_PUBLIC_LOG_LEVEL || (__DEV__ ? "debug" : "error");

// Logger configuration, servity levels as follows:
const config = {
	severity: logLevel,
	transportOptions: {
		colors: {
			info: "blueBright",
			warn: "yellowBright",
			error: "redBright",
			debug: "magentaBright"
		}
	}
};

export const log = logger.createLogger(config);
