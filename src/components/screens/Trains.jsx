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
} from "react-native";
import axios from "axios";
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';

const lines = [
    {label: 'Red', codes: ['red'], color: '#c60c30', stations: [], isFiltered: false}, 
    {label: 'Blue', codes: ['blue'], color: '#00a1de', stations: [], isFiltered: false}, 
    {label: 'Brown', codes: ['brn'], color: '#62361b', stations: [], isFiltered: false}, 
    {label: 'Green', codes: ['g'], color: '#009b3a', stations: [], isFiltered: false}, 
    {label: 'Orange', codes: ['o'], color: '#f9461c', stations: [], isFiltered: false}, 
    {label: 'Pink', codes: ['pnk'], color: '#e27ea6', stations: [], isFiltered: false}, 
    {label: 'Purple', codes: ['p', 'pexp'], color: '#522398', stations: [], isFiltered: false}, 
    {label: 'Yellow', codes: ['y'], color: '#f9e300', stations: [], isFiltered: false}
];

function Trains() {
    const [search, setSearch] = useState("");
    const [filteredStations, setFilteredStations] = useState({});
    const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStations = async () => {
            try {
                const response = await axios.get(
                    "https://data.cityofchicago.org/resource/8pix-ypme.json"
                );
                console.log(response.data);

                const stopData = response.data;

                // Clear stations in lines
                lines.forEach(line => {
                    line.stations = [];
                });

                stopData.forEach(stop => {
                    lines.forEach(line => {
                        line.codes.forEach(code => {
                            if (stop[code] === true) {
                                // Check if the station already exists in this line by name
                                const existingStation = line.stations.some(
                                    (station) => station.station_name === stop.station_name
                                );
                                if (!existingStation) {
                                    // Add the station if it doesn't exist
                                    line.stations.push({
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
                });
            } catch (error) {
                console.error("Error fetching train station data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStations();
    }, []);

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

    const handleSuggestionClick = (suggestion) => {
        setSearch(suggestion);
        handleSearch(suggestion);
    };

    const toggleDropdown = (line) => {
        setFilteredStations((prevState) => ({
            ...prevState,
            [line]: prevState[line] ? [] : lines.find((l) => l.label === line).stations,
        }));
    };

    const toggleFilterModal = () => {
        setIsFilterModalVisible(!isFilterModalVisible);
    };

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
                        {search.length > 0 && (
                            <ScrollView style={styles.suggestionsContainer}>
                                {Object.keys(filteredStations).map((line, index) => (
                                    <TouchableOpacity key={index} onPress={() => toggleDropdown(line)}>
                                        <Text>{line}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}

                        <SectionList
                            sections={lines.map((line) => ({
                                title: line.label,
                                data: search.length > 0 ? filterStations(line) : line.stations,
                                color: line.color,
                                stops: filterStations(line).length,
                            }))}
                            renderItem={({ item, section }) => (
                                <View style={styles.stopCard}>
                                    <View style={[styles.stopColorIndicator, { backgroundColor: section.color }]} />
                                    <View style={styles.stopInfo}>
                                        <Text style={styles.stopName}>
                                            {item.station_name} 
                                            {/* TODO: fix margin within styles.adaIcon, will not work for some reason */}
                                            {item.ada && (
                                                <FontAwesome name="wheelchair" size={14} color="black" style={[styles.adaIcon]}/>
                                            )}
                                        </Text>
                                        <Text style={styles.stopId}>
                                            Connections: {extractConnections(item.station_descriptive_name)}
                                        </Text>
                                    </View>
                                </View>
                            )}
                            renderSectionHeader={({ section }) => (
                                <TouchableOpacity
                                    onPress={() => toggleDropdown(section.title)}
                                    style={[styles.sectionHeader, { borderLeftColor: section.color }]}
                                >
                                    <Text style={styles.lineTitle}>
                                        {section.title} Line ({section.stops} stops)
                                    </Text>
                                    <Ionicons
                                        name={filteredStations[section.title] ? 'chevron-up' : 'chevron-down'}
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
                        <Text style={styles.modalTitle}>Filter Train Lines</Text>
                        <FlatList
                            data={lines.map((line) => ({ key: line.label, label: line.label }))}
                            renderItem={({ item }) => (
                                <TouchableOpacity onPress={() => toggleDropdown(item.label)}>
                                    <Text style={styles.filterItem}>{item.label}</Text>
                                </TouchableOpacity>
                            )}
                            keyExtractor={(item) => item.key}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.modalButton} onPress={toggleFilterModal}>
                                <Text style={styles.modalButtonText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
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
    adaIcon: {
        marginLeft: 12,
    },
    stopId: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
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