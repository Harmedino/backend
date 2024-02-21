import asyncHandler from "../middlewares/asyncHandler.js";
import Product from "../models/productModel.js";
import Search from "../models/searchModel.js";

const addProduct = asyncHandler(async (req, res) => {
  try {
    const { name, description, price, category, quantity, brand } = req.fields;

    // Validation
    switch (true) {
      case !name:
        return res.json({ error: "Name is required" });
      case !brand:
        return res.json({ error: "Brand is required" });
      case !description:
        return res.json({ error: "Description is required" });
      case !price:
        return res.json({ error: "Price is required" });
      case !category:
        return res.json({ error: "Category is required" });
      case !quantity:
        return res.json({ error: "Quantity is required" });
    }

    const product = new Product({ ...req.fields });
    await product.save();
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(400).json(error.message);
  }
});

const updateProductDetails = asyncHandler(async (req, res) => {
  try {
    const { name, description, price, category, quantity, brand } = req.fields;

    // Validation
    switch (true) {
      case !name:
        return res.json({ error: "Name is required" });
      case !brand:
        return res.json({ error: "Brand is required" });
      case !description:
        return res.json({ error: "Description is required" });
      case !price:
        return res.json({ error: "Price is required" });
      case !category:
        return res.json({ error: "Category is required" });
      case !quantity:
        return res.json({ error: "Quantity is required" });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { ...req.fields },
      { new: true }
    );

    await product.save();

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(400).json(error.message);
  }
});

const removeProduct = asyncHandler(async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

const fetchProducts = asyncHandler(async (req, res) => {
  try {
    const { keyword } = req.query;

    // Check if keyword is empty
    if (!keyword || keyword.trim() === "") {
      // If keyword is empty, return an empty array or appropriate message
      return res.json({ products: [] });
    }

    // If keyword is not empty, perform the query
    const products = await Product.find({
      name: {
        $regex: keyword,
        $options: "i",
      },
    });

    res.json({ products });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server Error" });
  }
});

const fetchProductById = asyncHandler(async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      return res.json(product);
    } else {
      res.status(404);
      throw new Error("Product not found");
    }
  } catch (error) {
    console.error(error);
    res.status(404).json({ error: "Product not found" });
  }
});

const fetchAllProducts = asyncHandler(async (req, res) => {
  try {
    const products = await Product.find({})
      .populate("category")
      .limit(12)
      .sort({ createAt: -1 });

    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server Error" });
  }
});

const addProductReview = asyncHandler(async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);

    if (product) {
      const alreadyReviewed = product.reviews.find(
        (r) => r.user.toString() === req.user._id.toString()
      );

      if (alreadyReviewed) {
        res.status(400);
        throw new Error("Product already reviewed");
      }

      const review = {
        name: req.user.username,
        rating: Number(rating),
        comment,
        user: req.user._id,
      };

      product.reviews.push(review);

      product.numReviews = product.reviews.length;

      product.rating =
        product.reviews.reduce((acc, item) => item.rating + acc, 0) /
        product.reviews.length;

      await product.save();
      res.status(201).json({ message: "Review added" });
    } else {
      res.status(404);
      throw new Error("Product not found");
    }
  } catch (error) {
    console.error(error);
    res.status(400).json(error.message);
  }
});

const fetchTopProducts = asyncHandler(async (req, res) => {
  try {
    const products = await Product.find({}).sort({ rating: -1 }).limit(4);
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(400).json(error.message);
  }
});

const fetchNewProducts = asyncHandler(async (req, res) => {
  try {
    const products = await Product.find().sort({ _id: -1 }).limit(5);
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(400).json(error.message);
  }
});

const filterProducts = asyncHandler(async (req, res) => {
  try {
    const { checked, radio } = req.body;

    let args = {};
    if (checked.length > 0) args.category = checked;
    if (radio.length) args.price = { $gte: radio[0], $lte: radio[1] };

    const products = await Product.find(args);
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server Error" });
  }
});

const searchInput = asyncHandler(async (req, res) => {
  try {
    const { value, user } = req.body;

    // Save the search entry to the database
    let search = await Search.findOne({ user });

    if (search) {
      // If an existing search entry is found, ensure value is an array
      search.value = Array.isArray(search.value)
        ? search.value
        : [search.value];
      // Update the value array
      search.value.push(value);
    } else {
      // If no existing search entry is found, create a new one with value as an array
      search = new Search({
        value: [value], // Initialize the value array with the new value
        user,
      });
    }

    await search.save();

    // Find the most searched product for the user
    const recommendation = await findMostSearchedProduct(user);

    res.status(201).json({
      success: true,
      message: "Search input saved successfully",
      recommendation,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

const findMostSearchedProduct = async (userId) => {
  try {
    // Find all search documents for the user
    const searches = await Search.find({ user: userId });

    // Create an empty object to store the count of each search term
    const searchCounts = {};

    // Iterate through each search document
    searches.forEach((search) => {
      // Extract search terms from the document
      const searchTerms = search.value;

      // Increment the count for each search term
      searchTerms.forEach((term) => {
        searchCounts[term] = (searchCounts[term] || 0) + 1;
      });
    });

    // Sort the search terms by their counts in descending order
    const sortedSearchTerms = Object.keys(searchCounts).sort(
      (a, b) => searchCounts[b] - searchCounts[a]
    );

    // Get the most searched words
    let mostSearchedWords = sortedSearchTerms.slice(0, 1); // Get the top 1 most searched word

    // If there are multiple terms with the same highest count, return one randomly
    if (sortedSearchTerms.length > 1 && searchCounts[sortedSearchTerms[0]] === searchCounts[sortedSearchTerms[1]]) {
      const randomIndex = Math.floor(Math.random() * mostSearchedWords.length);
      mostSearchedWords = [mostSearchedWords[randomIndex]];
    }

    return mostSearchedWords;
  } catch (error) {
    console.error("Error finding most searched words:", error);
    throw error;
  }
};


export {
  addProduct,
  updateProductDetails,
  removeProduct,
  fetchProducts,
  fetchProductById,
  fetchAllProducts,
  addProductReview,
  fetchTopProducts,
  fetchNewProducts,
  filterProducts,
  searchInput,
};
