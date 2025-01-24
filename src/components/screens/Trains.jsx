import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Modal,
    ActivityIndicator,
    SectionList,
    SafeAreaView,
    StatusBar,
    FlatList,
    Switch,
} from "react-native";
import axios from "axios";
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';

function Trains() {
    const [search, setSearch] = useState("");
    const [filteredStations, setFilteredStations] = useState({});
    const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [lines, setLines] = useState([
        {label: 'Red', codes: ['red'], color: '#c60c30', stations: [], isFiltered: false, dropdownOn: false}, 
        {label: 'Blue', codes: ['blue'], color: '#00a1de', stations: [], isFiltered: false, dropdownOn: false}, 
        {label: 'Brown', codes: ['brn'], color: '#62361b', stations: [], isFiltered: false, dropdownOn: false}, 
        {label: 'Green', codes: ['g'], color: '#009b3a', stations: [], isFiltered: false, dropdownOn: false}, 
        {label: 'Orange', codes: ['o'], color: '#f9461c', stations: [], isFiltered: false, dropdownOn: false}, 
        {label: 'Pink', codes: ['pnk'], color: '#e27ea6', stations: [], isFiltered: false, dropdownOn: false}, 
        {label: 'Purple', codes: ['p', 'pexp'], color: '#522398', stations: [], isFiltered: false, dropdownOn: false}, 
        {label: 'Yellow', codes: ['y'], color: '#f9e300', stations: [], isFiltered: false, dropdownOn: false}
    ]);
    const [filters, setFilters] = useState(
        lines.reduce((acc, line) => ({
            ...acc,
            [line.label.toLowerCase()]: true
        }), {})
    );

    useEffect(() => {
        const fetchStations = async () => {
            try {
                const response = await axios.get(
                    "https://data.cityofchicago.org/resource/8pix-ypme.json"
                );

                const stopData = response.data;
                const updatedLines = lines.map(line => {
                    const updatedLine = { ...line, stations: [] };
                    stopData.forEach(stop => {
                        line.codes.forEach(code => {
                            if (stop[code] === true) {
                                const existingStation = updatedLine.stations.some((station) => station.station_name === stop.station_name);
                                if (!existingStation) {
                                    updatedLine.stations.push({
                                        stop_id: stop.stop_id,
                                        direction_id: stop.direction_id,
                                        stop_name: stop.stop_name,
                                        station_name: stop.station_name,
                                        station_descriptive_name: stop.station_descriptive_name,
                                        map_id: stop.map_id,
                                        ada: stop.ada,
                                    });
                                }
                            }
                         });
                    });
                    return updatedLine;
                });
                setLines(updatedLines);
            } catch (error) {
                console.error("Error fetching train station data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStations();
    }, []);

    const [predictions, setPredictions] = useState({});
    

    const fetchPredictions = async (stopId) => {
        try {
            const response = await axios.get(
                `https://lapi.transitchicago.com/api/1.0/ttarrivals.aspx?key=${process.env.CTA_API_KEY}&stpid=${stopId}&outputType=JSON`
            );
            const arrivals = response.data.ctatt.eta || [];
            arrivals.sort((a, b) => new Date(a.arrT) - new Date(b.arrT)); // Sort by arrival time
            setPredictions((prev) => ({
                ...prev,
                [stopId]: arrivals,
            }));
        } catch (error) {
            console.error("Error fetching predictions:", error);
        }
    };

    const [expandedStopId, setExpandedStopId] = useState(null);

    const toggleExpand = (stopId) => {
        if (expandedStopId === stopId) {
            setExpandedStopId(null);
        } else {
            setExpandedStopId(stopId);
            fetchPredictions(stopId); // Fetch predictions for the expanded stop
        }
    };


    const handleSearch = (text) => {
        setSearch(text);
    };

    // Filter stations based on the search term
    const filterStations = (line) => {
        return line.stations.filter((stop) =>
            stop.station_name.toLowerCase().includes(search.toLowerCase())
        );
    };

    const extractConnections = (stopName) => {
        const regex = /\(([^)]+)\)/g;
        const matches = [...stopName.matchAll(regex)];
        return matches.map((match) => match[1]).join(', ');
    };

    const toggleDropdown = (lineLabel) => {
        setLines((prevLines) =>
            prevLines.map((line) =>
                line.label === lineLabel
                    ? { ...line, dropdownOn: !line.dropdownOn } // Toggle dropdownOn for the matching line
                    : line // Keep other lines unchanged
            )
        );
    };

    const toggleFilterModal = () => {
        setIsFilterModalVisible(!isFilterModalVisible);
    };

    const applyFilters = () => {
        setLines(prevLines => 
            prevLines.map(line => ({
                ...line,
                isFiltered: !filters[line.label.toLowerCase()]
            }))
        );
        toggleFilterModal();
    };

    const renderFilterItem = ({ item }) => (
        <View style={styles.filterItem}>
            <Text style={styles.filterItemText}>{item.label}</Text>
            <Switch
                value={filters[item.label.toLowerCase()]}
                onValueChange={(value) => setFilters(prev => ({
                    ...prev,
                    [item.label.toLowerCase()]: value
                }))}
                trackColor={{ false: '#FFFFFF', true: '#4169e1' }}
                thumbColor={filters[item.label.toLowerCase()] ? '#FFFFFF' : '#4169e1'}
            />
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.container}>
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#007AFF" />
                        <Text style={styles.loadingText}>Loading Stations...</Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.header}>
                            <Text style={styles.headerTitle}>Chicago Train Stations</Text>
                            <TouchableOpacity style={styles.filterButton} onPress={toggleFilterModal}>
                                <Ionicons name="filter" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchBar}
                                placeholder="Search by Station Name"
                                value={search}
                                onChangeText={handleSearch}
                                clearButtonMode="always"
                                autoComplete=""
                            />
                        </View>

                        <SectionList
                            sections={search.length > 0 
                                ? [{ // When searching, show all matching stations in a single section
                                    title: "Search Results",
                                    data: lines
                                        .filter(line => !line.isFiltered)
                                        .flatMap(line => filterStations(line)),
                                    color: "#333" // Default color for search results
                                }]
                                : lines // When not searching, show normal line-based sections
                                    .filter(line => !line.isFiltered)
                                    .map((line) => ({
                                        title: line.label,
                                        data: line.dropdownOn ? filterStations(line) : [],
                                        color: line.color,
                                        stops: line.stations.length,
                                    }))}
                            renderItem={({ item, section }) => (
                                <TouchableOpacity onPress={() => toggleExpand(item.stop_id)}>
                                    <View style={styles.stopCard}>
                                        <View style={[styles.stopColorIndicator, { backgroundColor: 
                                            // Show the line's color for each station by finding its parent line
                                            search.length > 0 
                                                ? lines.find(line => 
                                                    line.stations.some(station => 
                                                        station.stop_id === item.stop_id
                                                    )
                                                )?.color || "#333"
                                                : section.color 
                                        }]} />
                                        <View style={styles.stopInfo}>
                                            <View style={styles.stationTitleContainer}>
                                                <Text style={styles.stopName}>{item.station_name}</Text>
                                                {item.ada && (
                                                    <FontAwesome name="wheelchair" size={14} color="black"/>
                                                )}
                                            </View>
                                            {/* <Text style={styles.stopSubText}>Stop ID: {item.stop_id}</Text> */}
                                            <Text style={styles.stopSubText}>
                                                Connections: {extractConnections(item.station_descriptive_name)}
                                            </Text>
                                            {expandedStopId === item.stop_id && (
                                                <View style={styles.expandedContent}>
                                                    <Text style={styles.stopSubText}>Predictions:</Text>
                                                    {predictions[item.stop_id]?.length > 0 ? (
                                                        <View>
                                                            <View style={styles.predictionTableHeader}>
                                                                <Text style={[styles.predictionText, styles.boldText]}>Train</Text>
                                                                <Text style={[styles.predictionText, styles.boldText]}>Direction</Text>
                                                                <Text style={[styles.predictionText, styles.boldText]}>Arrival Time</Text>
                                                            </View>
                                                            {predictions[item.stop_id].map((prediction, index) => (
                                                                <View key={index} style={styles.predictionRow}>
                                                                    <Text style={styles.predictionText}>{prediction.rn}</Text>
                                                                    <Text style={styles.predictionText}>{prediction.destNm}</Text>
                                                                    <Text style={styles.predictionText}>
                                                                        {new Date(prediction.arrT).toLocaleTimeString([], {
                                                                            hour: "2-digit",
                                                                            minute: "2-digit",
                                                                        })}
                                                                    </Text>
                                                                </View>
                                                            ))}
                                                        </View>
                                                    ) : (
                                                        <Text style={styles.stopSubText}>No predictions available.</Text>
                                                    )}
                                                </View>
                                            )}

                                        </View>
                                    </View>
                                </TouchableOpacity>
                            )}
                            renderSectionHeader={({ section }) => (
                                search.length > 0 ? null : // Hide section headers during search
                                <TouchableOpacity
                                    onPress={() => toggleDropdown(section.title)}
                                    style={[styles.sectionHeader, { borderLeftColor: section.color }]}
                                >
                                    <Text style={styles.lineTitle}>
                                        {section.title} Line ({section.stops} stops)
                                    </Text>
                                    <Ionicons
                                        name={section.data.length > 0 ? 'chevron-up' : 'chevron-down'}
                                        size={24}
                                        color="#666"
                                    />
                                </TouchableOpacity>
                            )}
                            keyExtractor={(item) => `${item.stop_id}`}
                        />
                    </>
                )}
            </View>
            <Modal
            animationType="slide"
            transparent={true}
            visible={isFilterModalVisible}
            onRequestClose={toggleFilterModal}
            >
                <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Filter Stations</Text>
                    <FlatList
                    data={lines.map(line => ({
                        key: line.codes[0],
                        label: line.label
                    }))}
                    renderItem={renderFilterItem}
                    keyExtractor={(item) => item.key}
                    />
                    <View style={styles.modalButtons}>
                    <TouchableOpacity style={styles.modalButton} onPress={applyFilters}>
                        <Text style={styles.modalButtonText}>Apply Filters</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={toggleFilterModal}>
                        <Text style={styles.modalButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    </View>
                </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    stationTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    safeArea: {
        flex: 1,
        backgroundColor: '#f4f4f4',
    },
    container: {
        flex: 1,
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingHorizontal: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchBar: {
        flex: 1,
        height: 40,
        fontSize: 16,
    },
    suggestionsContainer: {
        backgroundColor: '#fff',
        borderRadius: 8,
        marginBottom: 16,
        maxHeight: 150,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    suggestionItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    suggestionText: {
        fontSize: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        borderLeftWidth: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    lineTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    stopCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 8,
        marginBottom: 8,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    stopColorIndicator: {
        width: 8,
        height: '100%',
        borderRadius: 4,
        marginRight: 12,
    },
    stopInfo: {
        flex: 1,
    },
    stopName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    stopSubText: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    expandedContent: {
        padding: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 5,
        marginTop: 5,
    },
    predictionTableHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#ccc",
    },
    predictionRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 8,
    },
    predictionText: {
        fontSize: 14,
        color: "#333",
        flex: 1,
        textAlign: "center",
    },
    boldText: {
        fontWeight: "bold",
    },

    filterButton: {
        backgroundColor: '#007AFF',
        padding: 10,
        borderRadius: 8,
    },
    clearFiltersButton: {
        backgroundColor: '#ff4444',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    clearFiltersText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        width: '80%',
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#333',
    },
    filterItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    filterItemText: {
        fontSize: 16,
        color: '#333',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    modalButton: {
        flex: 1,
        backgroundColor: '#007AFF',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 4,
    },
    cancelButton: {
        backgroundColor: '#ff4444',
    },
    modalButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 18,
        color: '#666',
    },
});

export default Trains;