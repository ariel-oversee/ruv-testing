/**
 * Vector Space Visualization System
 *
 * Comprehensive 3D vector space visualization with dimensionality reduction,
 * interactive exploration, and real-time plotting capabilities.
 *
 * Features:
 * - 3D vector space visualization
 * - Dimensionality reduction (t-SNE, UMAP, PCA)
 * - Interactive cluster exploration
 * - Real-time vector plotting
 * - Similarity heatmaps
 * - Vector trajectory animation
 * - Embedding space navigation
 * - Cluster labeling
 * - Outlier detection visualization
 * - Multi-format export
 *
 * @module VectorVisualization
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as d3 from 'd3';

/**
 * Main Vector Visualization class
 */
export class VectorVisualizer {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container ${containerId} not found`);
    }

    // Configuration
    this.config = {
      width: options.width || this.container.clientWidth,
      height: options.height || this.container.clientHeight,
      backgroundColor: options.backgroundColor || 0x1a1a2e,
      pointSize: options.pointSize || 0.05,
      pointColor: options.pointColor || 0x00d9ff,
      showGrid: options.showGrid !== false,
      showAxes: options.showAxes !== false,
      enableAnimation: options.enableAnimation !== false,
      enableInteraction: options.enableInteraction !== false,
      clusterColors: options.clusterColors || this.generateColorPalette(20),
      dimensionality: options.dimensionality || 3,
      ...options
    };

    // State
    this.vectors = [];
    this.clusters = new Map();
    this.outliers = new Set();
    this.selectedVectors = new Set();
    this.animationFrameId = null;
    this.isAnimating = false;
    this.trajectories = new Map();
    this.heatmapData = null;

    // Three.js components
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // D3 components for 2D overlays
    this.svg = null;
    this.tooltip = null;

    // Dimensionality reduction workers
    this.reductionWorkers = new Map();

    this.initialize();
  }

  /**
   * Initialize the visualization system
   */
  initialize() {
    this.setupThreeJS();
    this.setupD3Overlays();
    this.setupEventListeners();
    this.setupTooltip();

    if (this.config.showGrid) this.addGrid();
    if (this.config.showAxes) this.addAxes();

    this.animate();
  }

  /**
   * Setup Three.js scene, camera, and renderer
   */
  setupThreeJS() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.config.backgroundColor);
    this.scene.fog = new THREE.Fog(this.config.backgroundColor, 10, 50);

    // Camera
    const aspect = this.config.width / this.config.height;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    this.camera.position.set(5, 5, 5);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(this.config.width, this.config.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    // Controls
    if (this.config.enableInteraction) {
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.screenSpacePanning = false;
      this.controls.minDistance = 1;
      this.controls.maxDistance = 100;
      this.controls.maxPolarAngle = Math.PI;
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    this.scene.add(directionalLight);
  }

  /**
   * Setup D3 overlays for 2D elements
   */
  setupD3Overlays() {
    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', this.config.width)
      .attr('height', this.config.height)
      .style('position', 'absolute')
      .style('top', 0)
      .style('left', 0)
      .style('pointer-events', 'none');

    // Add labels group
    this.labelsGroup = this.svg.append('g')
      .attr('class', 'labels');
  }

  /**
   * Setup tooltip for hover information
   */
  setupTooltip() {
    this.tooltip = d3.select(this.container)
      .append('div')
      .attr('class', 'vector-tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', '#fff')
      .style('padding', '10px')
      .style('border-radius', '5px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('font-family', 'monospace')
      .style('font-size', '12px')
      .style('z-index', 1000);
  }

  /**
   * Setup event listeners for interaction
   */
  setupEventListeners() {
    if (!this.config.enableInteraction) return;

    // Mouse move for hover effects
    this.renderer.domElement.addEventListener('mousemove', (event) => {
      this.onMouseMove(event);
    });

    // Click for selection
    this.renderer.domElement.addEventListener('click', (event) => {
      this.onMouseClick(event);
    });

    // Window resize
    window.addEventListener('resize', () => {
      this.onWindowResize();
    });

    // Keyboard shortcuts
    window.addEventListener('keydown', (event) => {
      this.onKeyDown(event);
    });
  }

  /**
   * Add grid helper to scene
   */
  addGrid() {
    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    this.scene.add(gridHelper);
  }

  /**
   * Add coordinate axes to scene
   */
  addAxes() {
    const axesHelper = new THREE.AxesHelper(10);
    this.scene.add(axesHelper);

    // Add axis labels
    this.addAxisLabel('X', 10, 0, 0, 0xff0000);
    this.addAxisLabel('Y', 0, 10, 0, 0x00ff00);
    this.addAxisLabel('Z', 0, 0, 10, 0x0000ff);
  }

  /**
   * Add axis label
   */
  addAxisLabel(text, x, y, z, color) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 256;

    context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    context.font = 'Bold 100px Arial';
    context.textAlign = 'center';
    context.fillText(text, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.set(x, y, z);
    sprite.scale.set(0.5, 0.5, 0.5);

    this.scene.add(sprite);
  }

  /**
   * Add vectors to visualization
   * @param {Array} vectors - Array of vector objects with {id, values, metadata}
   */
  async addVectors(vectors, options = {}) {
    this.vectors = vectors.map((v, idx) => ({
      id: v.id || `vec_${idx}`,
      original: v.values,
      reduced: null,
      metadata: v.metadata || {},
      cluster: v.cluster || null,
      isOutlier: v.isOutlier || false,
      ...v
    }));

    // Apply dimensionality reduction if needed
    if (options.reduction) {
      await this.applyDimensionalityReduction(options.reduction, options.reductionParams);
    } else {
      // Use original values (assume they're already 3D or take first 3 dimensions)
      this.vectors.forEach(v => {
        v.reduced = v.original.slice(0, 3);
      });
    }

    // Render vectors
    this.renderVectors();

    // Update clusters if they exist
    if (options.detectClusters) {
      this.detectClusters(options.clusterParams);
    }

    // Detect outliers if requested
    if (options.detectOutliers) {
      this.detectOutliers(options.outlierParams);
    }
  }

  /**
   * Apply dimensionality reduction
   */
  async applyDimensionalityReduction(method = 'pca', params = {}) {
    console.log(`Applying ${method.toUpperCase()} dimensionality reduction...`);

    const matrix = this.vectors.map(v => v.original);
    let reduced;

    switch (method.toLowerCase()) {
      case 'pca':
        reduced = await this.computePCA(matrix, params);
        break;
      case 'tsne':
        reduced = await this.computeTSNE(matrix, params);
        break;
      case 'umap':
        reduced = await this.computeUMAP(matrix, params);
        break;
      default:
        throw new Error(`Unknown reduction method: ${method}`);
    }

    // Update vectors with reduced coordinates
    this.vectors.forEach((v, idx) => {
      v.reduced = reduced[idx];
    });

    return reduced;
  }

  /**
   * Compute PCA (Principal Component Analysis)
   */
  async computePCA(matrix, params = {}) {
    const { components = 3 } = params;

    // Center the data
    const means = this.computeMeans(matrix);
    const centered = matrix.map(row =>
      row.map((val, idx) => val - means[idx])
    );

    // Compute covariance matrix
    const covariance = this.computeCovariance(centered);

    // Compute eigenvectors and eigenvalues
    const { vectors, values } = this.computeEigen(covariance);

    // Sort by eigenvalues
    const sorted = vectors
      .map((vec, idx) => ({ vec, val: values[idx] }))
      .sort((a, b) => b.val - a.val)
      .slice(0, components);

    // Project data onto principal components
    const projection = centered.map(row =>
      sorted.map(({ vec }) =>
        row.reduce((sum, val, idx) => sum + val * vec[idx], 0)
      )
    );

    // Normalize to [-5, 5] range for visualization
    return this.normalizeCoordinates(projection);
  }

  /**
   * Compute t-SNE (t-Distributed Stochastic Neighbor Embedding)
   */
  async computeTSNE(matrix, params = {}) {
    const {
      perplexity = 30,
      epsilon = 10,
      iterations = 1000
    } = params;

    // This is a simplified t-SNE implementation
    // For production, use a library like tsnejs or ml-tsne

    // Initialize random positions
    let Y = matrix.map(() =>
      Array(3).fill(0).map(() => Math.random() * 10 - 5)
    );

    // Compute pairwise distances
    const distances = this.computePairwiseDistances(matrix);

    // Convert distances to probabilities
    const P = this.computeTSNEProbabilities(distances, perplexity);

    // Gradient descent
    for (let iter = 0; iter < iterations; iter++) {
      const Q = this.computeLowDimProbabilities(Y);
      const grad = this.computeTSNEGradient(P, Q, Y);

      // Update Y
      Y = Y.map((point, i) =>
        point.map((coord, j) => coord - epsilon * grad[i][j])
      );

      if (iter % 100 === 0) {
        console.log(`t-SNE iteration ${iter}/${iterations}`);
      }
    }

    return this.normalizeCoordinates(Y);
  }

  /**
   * Compute UMAP (Uniform Manifold Approximation and Projection)
   */
  async computeUMAP(matrix, params = {}) {
    const {
      nNeighbors = 15,
      minDist = 0.1,
      nComponents = 3,
      nEpochs = 200
    } = params;

    // Simplified UMAP implementation
    // For production, use umap-js library

    // Compute k-nearest neighbors
    const knn = this.computeKNN(matrix, nNeighbors);

    // Compute fuzzy simplicial set
    const graph = this.computeFuzzySimplicialSet(matrix, knn);

    // Initialize embedding
    let embedding = this.initializeEmbedding(matrix.length, nComponents);

    // Optimize embedding
    for (let epoch = 0; epoch < nEpochs; epoch++) {
      embedding = this.optimizeUMAPEmbedding(embedding, graph, minDist);

      if (epoch % 20 === 0) {
        console.log(`UMAP epoch ${epoch}/${nEpochs}`);
      }
    }

    return this.normalizeCoordinates(embedding);
  }

  /**
   * Render vectors as 3D points
   */
  renderVectors() {
    // Clear existing points
    const existingPoints = this.scene.children.filter(
      child => child.userData.type === 'vectorPoint'
    );
    existingPoints.forEach(point => this.scene.remove(point));

    // Create instanced mesh for performance
    const geometry = new THREE.SphereGeometry(this.config.pointSize, 16, 16);

    // Group vectors by cluster for efficient rendering
    const clusterGroups = new Map();

    this.vectors.forEach(vector => {
      const cluster = vector.cluster || 'default';
      if (!clusterGroups.has(cluster)) {
        clusterGroups.set(cluster, []);
      }
      clusterGroups.get(cluster).push(vector);
    });

    // Render each cluster group
    clusterGroups.forEach((vectors, cluster) => {
      const color = this.getClusterColor(cluster);
      const material = new THREE.MeshPhongMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.2
      });

      vectors.forEach(vector => {
        const mesh = new THREE.Mesh(geometry, material.clone());
        const [x, y, z] = vector.reduced;
        mesh.position.set(x, y, z);
        mesh.userData = {
          type: 'vectorPoint',
          vectorId: vector.id,
          vector: vector,
          isOutlier: vector.isOutlier
        };

        // Highlight outliers
        if (vector.isOutlier) {
          mesh.material.emissiveIntensity = 0.8;
          mesh.scale.set(1.5, 1.5, 1.5);
        }

        this.scene.add(mesh);
      });
    });

    // Render cluster labels
    this.renderClusterLabels();
  }

  /**
   * Render cluster labels
   */
  renderClusterLabels() {
    this.labelsGroup.selectAll('*').remove();

    const clusters = new Map();

    // Compute cluster centroids
    this.vectors.forEach(vector => {
      const cluster = vector.cluster || 'default';
      if (!clusters.has(cluster)) {
        clusters.set(cluster, { vectors: [], centroid: [0, 0, 0] });
      }
      clusters.get(cluster).vectors.push(vector);
    });

    clusters.forEach((data, cluster) => {
      // Compute centroid
      const centroid = [0, 0, 0];
      data.vectors.forEach(v => {
        centroid[0] += v.reduced[0];
        centroid[1] += v.reduced[1];
        centroid[2] += v.reduced[2];
      });
      centroid[0] /= data.vectors.length;
      centroid[1] /= data.vectors.length;
      centroid[2] /= data.vectors.length;

      // Project to screen space
      const screenPos = this.projectToScreen(centroid);

      if (screenPos) {
        this.labelsGroup.append('text')
          .attr('x', screenPos.x)
          .attr('y', screenPos.y)
          .attr('text-anchor', 'middle')
          .attr('fill', '#ffffff')
          .attr('font-size', '14px')
          .attr('font-weight', 'bold')
          .attr('stroke', '#000000')
          .attr('stroke-width', '2px')
          .attr('paint-order', 'stroke')
          .text(`Cluster ${cluster} (${data.vectors.length})`);
      }
    });
  }

  /**
   * Project 3D coordinates to screen space
   */
  projectToScreen(coords) {
    const vector = new THREE.Vector3(coords[0], coords[1], coords[2]);
    vector.project(this.camera);

    // Check if behind camera
    if (vector.z > 1) return null;

    const x = (vector.x + 1) / 2 * this.config.width;
    const y = -(vector.y - 1) / 2 * this.config.height;

    return { x, y };
  }

  /**
   * Detect clusters using k-means
   */
  detectClusters(params = {}) {
    const { k = 5, maxIterations = 100 } = params;

    const points = this.vectors.map(v => v.reduced);
    const { clusters, centroids } = this.kMeans(points, k, maxIterations);

    // Update vector cluster assignments
    this.vectors.forEach((v, idx) => {
      v.cluster = clusters[idx];
    });

    this.clusters.clear();
    clusters.forEach((cluster, idx) => {
      if (!this.clusters.has(cluster)) {
        this.clusters.set(cluster, []);
      }
      this.clusters.get(cluster).push(this.vectors[idx]);
    });

    this.renderVectors();
  }

  /**
   * K-means clustering algorithm
   */
  kMeans(points, k, maxIterations) {
    // Initialize centroids randomly
    let centroids = this.initializeCentroids(points, k);
    let clusters = new Array(points.length);
    let changed = true;
    let iteration = 0;

    while (changed && iteration < maxIterations) {
      changed = false;

      // Assign points to nearest centroid
      points.forEach((point, idx) => {
        const nearest = this.findNearestCentroid(point, centroids);
        if (clusters[idx] !== nearest) {
          clusters[idx] = nearest;
          changed = true;
        }
      });

      // Update centroids
      centroids = this.updateCentroids(points, clusters, k);
      iteration++;
    }

    console.log(`K-means converged after ${iteration} iterations`);
    return { clusters, centroids };
  }

  /**
   * Detect outliers using isolation forest approach
   */
  detectOutliers(params = {}) {
    const { threshold = 0.1 } = params;

    const points = this.vectors.map(v => v.reduced);
    const scores = this.computeOutlierScores(points);

    // Mark top threshold% as outliers
    const sortedScores = [...scores].sort((a, b) => b - a);
    const thresholdScore = sortedScores[Math.floor(scores.length * threshold)];

    this.outliers.clear();
    this.vectors.forEach((v, idx) => {
      if (scores[idx] >= thresholdScore) {
        v.isOutlier = true;
        this.outliers.add(v.id);
      } else {
        v.isOutlier = false;
      }
    });

    this.renderVectors();
  }

  /**
   * Compute outlier scores (simplified isolation forest)
   */
  computeOutlierScores(points) {
    const scores = new Array(points.length).fill(0);

    points.forEach((point, idx) => {
      // Compute average distance to k nearest neighbors
      const distances = points.map((p, i) => ({
        distance: this.euclideanDistance(point, p),
        index: i
      }))
      .filter(d => d.index !== idx)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10); // k=10 neighbors

      const avgDistance = distances.reduce((sum, d) => sum + d.distance, 0) / distances.length;
      scores[idx] = avgDistance;
    });

    return scores;
  }

  /**
   * Create similarity heatmap
   */
  createSimilarityHeatmap(vectors = this.vectors) {
    const n = vectors.length;
    const heatmapData = Array(n).fill(0).map(() => Array(n).fill(0));

    // Compute pairwise similarities
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          heatmapData[i][j] = 1;
        } else {
          const similarity = this.cosineSimilarity(
            vectors[i].original,
            vectors[j].original
          );
          heatmapData[i][j] = similarity;
        }
      }
    }

    this.heatmapData = heatmapData;
    return heatmapData;
  }

  /**
   * Render similarity heatmap as overlay
   */
  renderSimilarityHeatmap(containerId = null) {
    if (!this.heatmapData) {
      this.createSimilarityHeatmap();
    }

    const container = containerId ?
      document.getElementById(containerId) :
      this.createHeatmapContainer();

    const margin = { top: 50, right: 50, bottom: 50, left: 50 };
    const width = 600 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Color scale
    const colorScale = d3.scaleSequential(d3.interpolateViridis)
      .domain([0, 1]);

    const n = this.heatmapData.length;
    const cellSize = Math.min(width, height) / n;

    // Draw cells
    this.heatmapData.forEach((row, i) => {
      row.forEach((value, j) => {
        svg.append('rect')
          .attr('x', j * cellSize)
          .attr('y', i * cellSize)
          .attr('width', cellSize)
          .attr('height', cellSize)
          .attr('fill', colorScale(value))
          .attr('stroke', '#333')
          .attr('stroke-width', 0.5)
          .on('mouseover', function() {
            d3.select(this).attr('stroke-width', 2);
          })
          .on('mouseout', function() {
            d3.select(this).attr('stroke-width', 0.5);
          })
          .append('title')
          .text(`Similarity: ${value.toFixed(3)}`);
      });
    });

    return svg;
  }

  /**
   * Animate vector trajectories
   */
  animateTrajectory(vectorId, trajectory, duration = 2000) {
    const vector = this.vectors.find(v => v.id === vectorId);
    if (!vector) return;

    const mesh = this.scene.children.find(
      child => child.userData.vectorId === vectorId
    );
    if (!mesh) return;

    const startPos = new THREE.Vector3(...vector.reduced);
    const endPos = new THREE.Vector3(...trajectory.slice(-3));

    const startTime = Date.now();
    this.trajectories.set(vectorId, {
      mesh,
      startPos,
      endPos,
      startTime,
      duration,
      trajectory
    });

    this.isAnimating = true;
  }

  /**
   * Update trajectory animations
   */
  updateTrajectories() {
    const now = Date.now();
    const toRemove = [];

    this.trajectories.forEach((traj, vectorId) => {
      const elapsed = now - traj.startTime;
      const progress = Math.min(elapsed / traj.duration, 1);

      // Ease in-out
      const eased = progress < 0.5 ?
        2 * progress * progress :
        1 - Math.pow(-2 * progress + 2, 2) / 2;

      // Interpolate position
      traj.mesh.position.lerpVectors(traj.startPos, traj.endPos, eased);

      // Draw trajectory line
      if (progress < 1) {
        this.drawTrajectoryLine(traj, eased);
      } else {
        toRemove.push(vectorId);
        // Update vector's reduced coordinates
        const vector = this.vectors.find(v => v.id === vectorId);
        if (vector) {
          vector.reduced = [traj.endPos.x, traj.endPos.y, traj.endPos.z];
        }
      }
    });

    // Remove completed trajectories
    toRemove.forEach(id => this.trajectories.delete(id));

    if (this.trajectories.size === 0) {
      this.isAnimating = false;
    }
  }

  /**
   * Draw trajectory line
   */
  drawTrajectoryLine(traj, progress) {
    // Remove old line
    const oldLine = this.scene.children.find(
      child => child.userData.trajectoryLine === traj.mesh.userData.vectorId
    );
    if (oldLine) this.scene.remove(oldLine);

    // Create new line
    const points = [
      traj.startPos,
      traj.mesh.position.clone()
    ];

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x00ff00,
      opacity: 0.5,
      transparent: true
    });
    const line = new THREE.Line(geometry, material);
    line.userData.trajectoryLine = traj.mesh.userData.vectorId;

    this.scene.add(line);
  }

  /**
   * Filter vectors by metadata
   */
  filterVectors(filterFn) {
    this.vectors.forEach(vector => {
      const mesh = this.scene.children.find(
        child => child.userData.vectorId === vector.id
      );
      if (mesh) {
        mesh.visible = filterFn(vector);
      }
    });
  }

  /**
   * Highlight vectors
   */
  highlightVectors(vectorIds, color = 0xffff00) {
    vectorIds.forEach(id => {
      const mesh = this.scene.children.find(
        child => child.userData.vectorId === id
      );
      if (mesh) {
        mesh.material.emissive.setHex(color);
        mesh.material.emissiveIntensity = 0.8;
        mesh.scale.set(1.5, 1.5, 1.5);
      }
    });
  }

  /**
   * Reset vector highlighting
   */
  resetHighlight() {
    this.scene.children
      .filter(child => child.userData.type === 'vectorPoint')
      .forEach(mesh => {
        const vector = mesh.userData.vector;
        const color = this.getClusterColor(vector.cluster || 'default');
        mesh.material.emissive.setHex(color);
        mesh.material.emissiveIntensity = vector.isOutlier ? 0.8 : 0.2;
        mesh.scale.set(vector.isOutlier ? 1.5 : 1, vector.isOutlier ? 1.5 : 1, vector.isOutlier ? 1.5 : 1);
      });
  }

  /**
   * Handle mouse move for hover effects
   */
  onMouseMove(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.scene.children.filter(child => child.userData.type === 'vectorPoint')
    );

    if (intersects.length > 0) {
      const vector = intersects[0].object.userData.vector;
      this.showTooltip(event, vector);

      // Highlight hovered point
      intersects[0].object.material.emissiveIntensity = 1;
    } else {
      this.hideTooltip();
      this.resetHighlight();
    }
  }

  /**
   * Handle mouse click for selection
   */
  onMouseClick(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.scene.children.filter(child => child.userData.type === 'vectorPoint')
    );

    if (intersects.length > 0) {
      const vectorId = intersects[0].object.userData.vectorId;

      if (event.shiftKey) {
        // Multi-select
        if (this.selectedVectors.has(vectorId)) {
          this.selectedVectors.delete(vectorId);
        } else {
          this.selectedVectors.add(vectorId);
        }
      } else {
        // Single select
        this.selectedVectors.clear();
        this.selectedVectors.add(vectorId);
      }

      this.updateSelection();
      this.emit('vectorSelected', {
        vectorIds: Array.from(this.selectedVectors),
        vectors: this.vectors.filter(v => this.selectedVectors.has(v.id))
      });
    }
  }

  /**
   * Update selection visual state
   */
  updateSelection() {
    this.resetHighlight();
    this.highlightVectors(Array.from(this.selectedVectors), 0xffff00);
  }

  /**
   * Show tooltip
   */
  showTooltip(event, vector) {
    const content = this.formatTooltipContent(vector);

    this.tooltip
      .style('opacity', 1)
      .style('left', `${event.pageX + 10}px`)
      .style('top', `${event.pageY - 10}px`)
      .html(content);
  }

  /**
   * Hide tooltip
   */
  hideTooltip() {
    this.tooltip.style('opacity', 0);
  }

  /**
   * Format tooltip content
   */
  formatTooltipContent(vector) {
    let html = `<strong>ID:</strong> ${vector.id}<br>`;
    html += `<strong>Cluster:</strong> ${vector.cluster || 'None'}<br>`;

    if (vector.isOutlier) {
      html += `<strong style="color: #ff4444;">OUTLIER</strong><br>`;
    }

    if (vector.metadata) {
      html += `<strong>Metadata:</strong><br>`;
      Object.entries(vector.metadata).forEach(([key, value]) => {
        html += `&nbsp;&nbsp;${key}: ${value}<br>`;
      });
    }

    html += `<strong>Coordinates:</strong><br>`;
    html += `&nbsp;&nbsp;[${vector.reduced.map(v => v.toFixed(3)).join(', ')}]`;

    return html;
  }

  /**
   * Handle window resize
   */
  onWindowResize() {
    this.config.width = this.container.clientWidth;
    this.config.height = this.container.clientHeight;

    this.camera.aspect = this.config.width / this.config.height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.config.width, this.config.height);

    this.svg
      .attr('width', this.config.width)
      .attr('height', this.config.height);
  }

  /**
   * Handle keyboard shortcuts
   */
  onKeyDown(event) {
    switch (event.key) {
      case 'r':
        // Reset camera
        this.camera.position.set(5, 5, 5);
        this.camera.lookAt(0, 0, 0);
        this.controls?.reset();
        break;
      case 'f':
        // Fit to view
        this.fitToView();
        break;
      case 'c':
        // Toggle clusters
        this.toggleClusters();
        break;
      case 'o':
        // Toggle outliers
        this.toggleOutliers();
        break;
      case 'Escape':
        // Clear selection
        this.selectedVectors.clear();
        this.updateSelection();
        break;
    }
  }

  /**
   * Fit camera to view all vectors
   */
  fitToView() {
    if (this.vectors.length === 0) return;

    const box = new THREE.Box3();

    this.vectors.forEach(vector => {
      box.expandByPoint(new THREE.Vector3(...vector.reduced));
    });

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    const cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));

    this.camera.position.set(
      center.x,
      center.y,
      center.z + cameraZ * 1.5
    );
    this.camera.lookAt(center);
    this.controls?.target.copy(center);
  }

  /**
   * Toggle cluster visualization
   */
  toggleClusters() {
    // Implementation for toggling cluster visualization
    console.log('Toggle clusters');
  }

  /**
   * Toggle outlier visualization
   */
  toggleOutliers() {
    const hideOutliers = !this.hideOutliers;
    this.hideOutliers = hideOutliers;

    this.vectors.forEach(vector => {
      if (vector.isOutlier) {
        const mesh = this.scene.children.find(
          child => child.userData.vectorId === vector.id
        );
        if (mesh) {
          mesh.visible = !hideOutliers;
        }
      }
    });
  }

  /**
   * Animation loop
   */
  animate() {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    if (this.controls) {
      this.controls.update();
    }

    if (this.isAnimating) {
      this.updateTrajectories();
    }

    // Update labels
    this.renderClusterLabels();

    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Export visualization
   */
  export(format = 'png') {
    switch (format.toLowerCase()) {
      case 'png':
        return this.exportPNG();
      case 'svg':
        return this.exportSVG();
      case 'json':
        return this.exportJSON();
      case 'csv':
        return this.exportCSV();
      default:
        throw new Error(`Unknown export format: ${format}`);
    }
  }

  /**
   * Export as PNG
   */
  exportPNG() {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  /**
   * Export as SVG
   */
  exportSVG() {
    // Would use THREE.SVGRenderer for proper implementation
    console.log('SVG export not yet implemented');
    return null;
  }

  /**
   * Export as JSON
   */
  exportJSON() {
    return JSON.stringify({
      vectors: this.vectors.map(v => ({
        id: v.id,
        original: v.original,
        reduced: v.reduced,
        cluster: v.cluster,
        isOutlier: v.isOutlier,
        metadata: v.metadata
      })),
      clusters: Array.from(this.clusters.entries()),
      outliers: Array.from(this.outliers),
      config: this.config
    }, null, 2);
  }

  /**
   * Export as CSV
   */
  exportCSV() {
    const headers = ['id', 'x', 'y', 'z', 'cluster', 'isOutlier'];
    const rows = this.vectors.map(v => [
      v.id,
      v.reduced[0],
      v.reduced[1],
      v.reduced[2],
      v.cluster || '',
      v.isOutlier
    ]);

    return [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
  }

  /**
   * Dispose and cleanup
   */
  dispose() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.scene.traverse(object => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });

    this.renderer.dispose();
    this.controls?.dispose();

    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
  }

  // ============================================================================
  // Utility Functions
  // ============================================================================

  /**
   * Generate color palette
   */
  generateColorPalette(n) {
    const palette = [];
    for (let i = 0; i < n; i++) {
      const hue = (i * 360 / n) % 360;
      palette.push(new THREE.Color(`hsl(${hue}, 70%, 50%)`).getHex());
    }
    return palette;
  }

  /**
   * Get cluster color
   */
  getClusterColor(cluster) {
    if (cluster === 'default') return this.config.pointColor;

    const clusterIndex = typeof cluster === 'string' ?
      parseInt(cluster) || 0 : cluster;

    return this.config.clusterColors[clusterIndex % this.config.clusterColors.length];
  }

  /**
   * Compute means
   */
  computeMeans(matrix) {
    const n = matrix.length;
    const d = matrix[0].length;
    const means = new Array(d).fill(0);

    matrix.forEach(row => {
      row.forEach((val, idx) => {
        means[idx] += val;
      });
    });

    return means.map(sum => sum / n);
  }

  /**
   * Compute covariance matrix
   */
  computeCovariance(centered) {
    const n = centered.length;
    const d = centered[0].length;
    const cov = Array(d).fill(0).map(() => Array(d).fill(0));

    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          sum += centered[k][i] * centered[k][j];
        }
        cov[i][j] = sum / (n - 1);
      }
    }

    return cov;
  }

  /**
   * Compute eigenvectors and eigenvalues (simplified)
   */
  computeEigen(matrix) {
    // This is a placeholder - use a proper linear algebra library
    // like ml-matrix or numeric.js in production
    const d = matrix.length;
    const vectors = Array(d).fill(0).map((_, i) => {
      const vec = Array(d).fill(0);
      vec[i] = 1;
      return vec;
    });
    const values = Array(d).fill(1);

    return { vectors, values };
  }

  /**
   * Normalize coordinates to visualization range
   */
  normalizeCoordinates(coords, range = 10) {
    const flat = coords.flat();
    const min = Math.min(...flat);
    const max = Math.max(...flat);
    const scale = range / (max - min);

    return coords.map(point =>
      point.map(val => (val - min) * scale - range / 2)
    );
  }

  /**
   * Compute pairwise distances
   */
  computePairwiseDistances(matrix) {
    const n = matrix.length;
    const distances = Array(n).fill(0).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dist = this.euclideanDistance(matrix[i], matrix[j]);
        distances[i][j] = dist;
        distances[j][i] = dist;
      }
    }

    return distances;
  }

  /**
   * Compute t-SNE probabilities
   */
  computeTSNEProbabilities(distances, perplexity) {
    // Simplified implementation
    const n = distances.length;
    const P = Array(n).fill(0).map(() => Array(n).fill(0));

    distances.forEach((row, i) => {
      const sum = row.reduce((s, d) => s + Math.exp(-d * d), 0);
      row.forEach((d, j) => {
        P[i][j] = Math.exp(-d * d) / sum;
      });
    });

    return P;
  }

  /**
   * Compute low-dimensional probabilities for t-SNE
   */
  computeLowDimProbabilities(Y) {
    const n = Y.length;
    const Q = Array(n).fill(0).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          const dist = this.euclideanDistance(Y[i], Y[j]);
          Q[i][j] = 1 / (1 + dist * dist);
        }
      }
    }

    // Normalize
    const sum = Q.flat().reduce((s, q) => s + q, 0);
    return Q.map(row => row.map(q => q / sum));
  }

  /**
   * Compute t-SNE gradient
   */
  computeTSNEGradient(P, Q, Y) {
    const n = Y.length;
    const grad = Array(n).fill(0).map(() => Array(Y[0].length).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          const diff = Y[i].map((yi, k) => yi - Y[j][k]);
          const factor = (P[i][j] - Q[i][j]) * Q[i][j];
          diff.forEach((d, k) => {
            grad[i][k] += 4 * factor * d;
          });
        }
      }
    }

    return grad;
  }

  /**
   * Compute k-nearest neighbors
   */
  computeKNN(matrix, k) {
    return matrix.map((point, idx) => {
      const distances = matrix
        .map((p, i) => ({
          index: i,
          distance: i === idx ? Infinity : this.euclideanDistance(point, p)
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, k);

      return distances.map(d => d.index);
    });
  }

  /**
   * Compute fuzzy simplicial set for UMAP
   */
  computeFuzzySimplicialSet(matrix, knn) {
    // Simplified implementation
    const n = matrix.length;
    const graph = Array(n).fill(0).map(() => Array(n).fill(0));

    knn.forEach((neighbors, i) => {
      neighbors.forEach(j => {
        const dist = this.euclideanDistance(matrix[i], matrix[j]);
        graph[i][j] = Math.exp(-dist);
        graph[j][i] = Math.exp(-dist);
      });
    });

    return graph;
  }

  /**
   * Initialize UMAP embedding
   */
  initializeEmbedding(n, d) {
    return Array(n).fill(0).map(() =>
      Array(d).fill(0).map(() => Math.random() * 10 - 5)
    );
  }

  /**
   * Optimize UMAP embedding
   */
  optimizeUMAPEmbedding(embedding, graph, minDist) {
    // Simplified gradient descent
    const learningRate = 0.1;
    const newEmbedding = embedding.map(point => [...point]);

    embedding.forEach((point, i) => {
      const gradient = [0, 0, 0];

      graph[i].forEach((weight, j) => {
        if (weight > 0 && i !== j) {
          const diff = point.map((pi, k) => pi - embedding[j][k]);
          const dist = Math.sqrt(diff.reduce((s, d) => s + d * d, 0));

          diff.forEach((d, k) => {
            gradient[k] += weight * d / (dist + minDist);
          });
        }
      });

      newEmbedding[i] = point.map((p, k) => p - learningRate * gradient[k]);
    });

    return newEmbedding;
  }

  /**
   * Initialize centroids for k-means
   */
  initializeCentroids(points, k) {
    const centroids = [];
    const indices = new Set();

    while (centroids.length < k) {
      const idx = Math.floor(Math.random() * points.length);
      if (!indices.has(idx)) {
        indices.add(idx);
        centroids.push([...points[idx]]);
      }
    }

    return centroids;
  }

  /**
   * Find nearest centroid
   */
  findNearestCentroid(point, centroids) {
    let nearest = 0;
    let minDist = Infinity;

    centroids.forEach((centroid, idx) => {
      const dist = this.euclideanDistance(point, centroid);
      if (dist < minDist) {
        minDist = dist;
        nearest = idx;
      }
    });

    return nearest;
  }

  /**
   * Update centroids
   */
  updateCentroids(points, clusters, k) {
    const centroids = Array(k).fill(0).map(() => Array(points[0].length).fill(0));
    const counts = Array(k).fill(0);

    points.forEach((point, idx) => {
      const cluster = clusters[idx];
      counts[cluster]++;
      point.forEach((val, dim) => {
        centroids[cluster][dim] += val;
      });
    });

    return centroids.map((centroid, idx) =>
      centroid.map(val => val / (counts[idx] || 1))
    );
  }

  /**
   * Euclidean distance
   */
  euclideanDistance(a, b) {
    return Math.sqrt(
      a.reduce((sum, val, idx) => sum + Math.pow(val - b[idx], 2), 0)
    );
  }

  /**
   * Cosine similarity
   */
  cosineSimilarity(a, b) {
    const dotProduct = a.reduce((sum, val, idx) => sum + val * b[idx], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magA * magB);
  }

  /**
   * Create heatmap container
   */
  createHeatmapContainer() {
    const container = document.createElement('div');
    container.id = 'heatmap-container';
    container.style.position = 'fixed';
    container.style.top = '10px';
    container.style.right = '10px';
    container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    container.style.padding = '10px';
    container.style.borderRadius = '5px';
    container.style.zIndex = '1000';
    document.body.appendChild(container);
    return container;
  }

  /**
   * Event emitter
   */
  emit(event, data) {
    const customEvent = new CustomEvent(event, { detail: data });
    this.container.dispatchEvent(customEvent);
  }

  /**
   * Event listener
   */
  on(event, callback) {
    this.container.addEventListener(event, (e) => callback(e.detail));
  }
}

/**
 * Export utility for creating visualizer instances
 */
export function createVectorVisualizer(containerId, options) {
  return new VectorVisualizer(containerId, options);
}

/**
 * Batch processing for large datasets
 */
export class BatchVectorProcessor {
  constructor(visualizer, batchSize = 1000) {
    this.visualizer = visualizer;
    this.batchSize = batchSize;
  }

  async processBatch(vectors, options = {}) {
    const batches = this.createBatches(vectors);

    for (let i = 0; i < batches.length; i++) {
      console.log(`Processing batch ${i + 1}/${batches.length}`);
      await this.visualizer.addVectors(batches[i], options);

      // Allow UI to update
      await this.sleep(0);
    }
  }

  createBatches(vectors) {
    const batches = [];
    for (let i = 0; i < vectors.length; i += this.batchSize) {
      batches.push(vectors.slice(i, i + this.batchSize));
    }
    return batches;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default VectorVisualizer;
