import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
	View,
	Text,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	ActivityIndicator,
	SectionList,
	SafeAreaView,
	StatusBar,
	FlatList
} from "react-native";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";

function Busses() {
	const [search, setSearch] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [routes, setRoutes] = useState([]);
	const [predictions, setPredictions] = useState({});

	useEffect(() => {
		const fetchRoutes = async () => {
			try {
				const routesResponse = await axios.get(
					`http://www.ctabustracker.com/bustime/api/v2/getroutes?key=${process.env.EXPO_PUBLIC_CTA_BUS_API_KEY}&format=json`
				);

				const routesData = routesResponse.data["bustime-response"].routes.map(
					route => ({
						routeName: route.rtnm,
						routeNum: route.rt,
						routeClr: route.rtclr,
						dropdownOn: false,
						directions: [],
						stops: {}
					})
				);

				const routesWithDirectionsAndStops = await Promise.all(
					routesData.map(async route => {
						const directionResponse = await axios.get(
							`http://www.ctabustracker.com/bustime/api/v2/getdirections?key=${process.env.EXPO_PUBLIC_CTA_BUS_API_KEY}&rt=${route.routeNum}&format=json`
						);

						const directions = directionResponse.data[
							"bustime-response"
						].directions.map(dir => dir.dir);
						route.directions = directions;

						await Promise.all(
							directions.map(async direction => {
								const stopsResponse = await axios.get(
									`http://www.ctabustracker.com/bustime/api/v2/getstops?key=${process.env.EXPO_PUBLIC_CTA_BUS_API_KEY}&rt=${route.routeNum}&dir=${direction}&format=json`
								);

								stopsResponse.data["bustime-response"].stops.forEach(stop => {
									const stopName = stop.stpnm;
									const stopId = stop.stpid;

									if (!route.stops[stopName]) {
										route.stops[stopName] = {
											directions: {},
											dropdownOn: false
										};
									}

									route.stops[stopName].directions[direction] = {
										stopId: stopId,
										predictions: []
									};
								});
							})
						);

						return route;
					})
				);

				setRoutes(routesWithDirectionsAndStops);
			} catch (error) {
				console.error("Error fetching bus route data:", error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchRoutes();
	}, []);

	const fetchStopPredictions = useCallback(
		async (stopId, routeNum, direction) => {
			try {
				const response = await axios.get(
					`http://www.ctabustracker.com/bustime/api/v2/getpredictions?key=${process.env.EXPO_PUBLIC_CTA_BUS_API_KEY}&rt=${routeNum}&stpid=${stopId}&format=json`
				);

				const predictions = response.data["bustime-response"].prd
					? response.data["bustime-response"].prd
					: [];

				const filteredPredictions = predictions.filter(
					prediction => prediction.rtdir === direction
				);

				setPredictions(prev => ({
					...prev,
					[`${routeNum}-${stopId}-${direction}`]: filteredPredictions
				}));
			} catch (error) {
				console.error(
					`Error fetching predictions for stopId ${stopId} routeNum ${routeNum} direction ${direction}:`,
					error
				);
			}
		},
		[]
	);

	const toggleRouteDropdown = useCallback(routeNum => {
		setRoutes(prevRoutes =>
			prevRoutes.map(route =>
				route.routeNum === routeNum
					? { ...route, dropdownOn: !route.dropdownOn }
					: route
			)
		);
	}, []);

	const toggleStopDropdown = useCallback(
		(stopName, routeNum) => {
			setRoutes(prevRoutes =>
				prevRoutes.map(route => {
					if (route.routeNum === routeNum) {
						const isExpanding = !route.stops[stopName].dropdownOn;

						if (isExpanding) {
							Object.entries(route.stops[stopName].directions).forEach(
								([direction, data]) => {
									fetchStopPredictions(data.stopId, routeNum, direction);
								}
							);
						}

						return {
							...route,
							stops: {
								...route.stops,
								[stopName]: {
									...route.stops[stopName],
									dropdownOn: isExpanding
								}
							}
						};
					}
					return route;
				})
			);
		},
		[fetchStopPredictions]
	);

	const handleSearch = useCallback(text => {
		setSearch(text);
	}, []);

	const filterStops = useCallback(
		route => {
			return Object.keys(route.stops).filter(stopName =>
				stopName.toLowerCase().includes(search.toLowerCase())
			);
		},
		[search]
	);

	const sections = useMemo(() => {
		return routes.map(route => ({
			...route,
			data: route.dropdownOn ? filterStops(route) : [],
			key: route.routeNum
		}));
	}, [routes, search, filterStops]);

	const renderPredictionItem = React.memo(({ item }) => {
		let etaTextStyle = [styles.predictionText, styles.boldText];
		if (item.dly === "1") {
			etaTextStyle = [...etaTextStyle, { color: "red" }];
		} else if (item.prdctdn <= 2 || item.prdctdn === "DUE") {
			etaTextStyle = [...etaTextStyle, { color: "green" }];
		}

		return (
			<View style={styles.predictionRow}>
				<Text style={styles.predictionText}>{item.vid}</Text>
				<Text style={styles.predictionText}>{item.des}</Text>
				<Text style={etaTextStyle}>
					{item.prdctdn <= 2 || item.prdctdn === "DUE"
						? "DUE"
						: `${item.prdctdn} min`}
				</Text>
			</View>
		);
	});

	const renderItem = ({ item, section }) => {
		const stopPredictions = Object.entries(section.stops[item].directions).map(
			([direction, data]) => {
				const key = `${section.routeNum}-${data.stopId}-${direction}`;
				return {
					direction,
					predictions: predictions[key] || []
				};
			}
		);

		return (
			<TouchableOpacity
				onPress={() => toggleStopDropdown(item, section.routeNum)}
			>
				<View style={styles.stopCard}>
					<View
						style={[
							styles.stopColorIndicator,
							{ backgroundColor: section.routeClr }
						]}
					/>
					<View style={styles.stopInfo}>
						<Text style={styles.stopName}>{item}</Text>
						{section.stops[item].dropdownOn && (
							<View style={styles.expandedContent}>
								{stopPredictions.map(({ direction, predictions }) => (
									<View key={direction} style={{ paddingTop: 10 }}>
										<Text style={styles.stopPredictionTitle}>{direction}</Text>
										<View style={styles.predictionTableHeader}>
											<Text style={[styles.predictionText, styles.boldText]}>
												Bus
											</Text>
											<Text style={[styles.predictionText, styles.boldText]}>
												Destination
											</Text>
											<Text style={[styles.predictionText, styles.boldText]}>
												ETA
											</Text>
										</View>
										{predictions.length > 0 ? (
											<FlatList
												data={predictions}
												renderItem={renderPredictionItem}
												keyExtractor={(item, index) => `${item.vid}-${index}`}
											/>
										) : (
											<Text style={[styles.predictionText, { padding: 10 }]}>
												No predictions available.
											</Text>
										)}
									</View>
								))}
							</View>
						)}
					</View>
				</View>
			</TouchableOpacity>
		);
	};

	const renderSectionHeader = ({ section }) => {
		return (
			<TouchableOpacity
				onPress={() => toggleRouteDropdown(section.routeNum)}
				style={[styles.sectionHeader, { borderLeftColor: section.routeClr }]}
			>
				<Text style={styles.routeTitle}>
					{section.routeNum} - {section.routeName}
				</Text>
				<Ionicons
					name={section.dropdownOn ? "chevron-up" : "chevron-down"}
					size={24}
					color="#666"
				/>
			</TouchableOpacity>
		);
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar barStyle="dark-content" />
			<View style={styles.container}>
				{isLoading ? (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="large" color="#007AFF" />
						<Text style={styles.loadingText}>Loading Bus Routes...</Text>
					</View>
				) : (
					<>
						<View style={styles.header}>
							<Text style={styles.headerTitle}>Chicago Bus Routes</Text>
						</View>
						<View style={styles.searchContainer}>
							<Ionicons
								name="search"
								size={20}
								color="#999"
								style={styles.searchIcon}
							/>
							<TextInput
								style={styles.searchBar}
								placeholder="Search by Stop Name"
								value={search}
								onChangeText={handleSearch}
								clearButtonMode="always"
								autoComplete=""
							/>
						</View>
						{search.length > 0 &&
						routes.flatMap(route => filterStops(route)).length < 1 ? (
							<Text style={styles.noMatch}>No Matching Stops</Text>
						) : (
							<SectionList
								sections={sections}
								keyExtractor={(item, index) => `${item}-${index}`}
								renderSectionHeader={renderSectionHeader}
								renderItem={renderItem}
							/>
						)}
					</>
				)}
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: "#f4f4f4"
	},
	container: {
		flex: 1,
		padding: 16
	},
	header: {
		marginBottom: 16
	},
	headerTitle: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#333"
	},
	searchContainer: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#fff",
		borderRadius: 8,
		paddingHorizontal: 12,
		marginBottom: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3
	},
	searchIcon: {
		marginRight: 8
	},
	searchBar: {
		flex: 1,
		height: 40,
		fontSize: 16
	},
	noMatch: {
		textAlign: "center",
		fontSize: 16,
		padding: 15
	},
	sectionHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		backgroundColor: "#fff",
		padding: 12,
		borderRadius: 8,
		marginBottom: 8,
		borderLeftWidth: 6,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3
	},
	routeTitle: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#333"
	},
	stopCard: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#fff",
		borderRadius: 8,
		marginBottom: 8,
		padding: 12,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 2
	},
	stopColorIndicator: {
		width: 8,
		height: "100%",
		borderRadius: 4,
		marginRight: 12
	},
	stopInfo: {
		flex: 1
	},
	stopName: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#333"
	},
	stopPredictionTitle: {
		fontSize: 16,
		fontWeight: "bold",
		color: "#333"
	},
	expandedContent: {
		padding: 10,
		backgroundColor: "#f0f0f0",
		borderRadius: 5,
		marginTop: 5
	},
	predictionTableHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: "#ccc"
	},
	predictionRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingVertical: 8
	},
	predictionText: {
		fontSize: 14,
		color: "#333",
		flex: 1,
		textAlign: "center"
	},
	boldText: {
		fontWeight: "bold"
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center"
	},
	loadingText: {
		marginTop: 16,
		fontSize: 18,
		color: "#666"
	}
});

export default Busses;
