import { number } from "joi";
import db from "../models";
const { Op } = require("sequelize");
const moment = require("moment");

function dynamicSortMultiple() {
  var props = arguments;
  return function (obj1, obj2) {
    var i = 0,
      result = 0,
      numberOfProperties = props.length;
    /* try getting a different result from 0 (equal)
     * as long as we have extra properties to compare
     */
    while (result === 0 && i < numberOfProperties) {
      result = dynamicSort(props[i])(obj1, obj2);
      i++;
    }
    return result;
  };
}

function dynamicSort(property) {
  var sortOrder = 1;
  if (property[0] === "-") {
    sortOrder = -1;
    property = property.substr(1);
  }
  return function (a, b) {
    /// sap xep tang dan
    var result =
      a[property] < b[property] ? -1 : a[property] > b[property] ? 1 : 0;
    return result * sortOrder;
  };
}

export const createNewProduct = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (
        !data.categoryId ||
        !data.brandId ||
        !data.image ||
        !data.nameDetail
      ) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameter!",
        });
      } else {
        let product = await db.Product.create({
          name: data.name,
          contentHTML: data.contentHTML,
          contentMarkdown: data.contentMarkdown,
          statusId: "S1",
          view: 0,
          categoryId: data.categoryId,
          madeby: data.madeby,
          brandId: data.brandId,
        });
        if (product) {
          let productdetail = await db.ProductDetail.create({
            productId: product.id,
            description: data.description,
            originalPrice: data.originalPrice,
            discountPrice: data.discountPrice,
            nameDetail: data.nameDetail,
          });
          if (productdetail) {
            await db.ProductImage.create({
              productdetailId: productdetail.id,
              image: data.image,
            });
            await db.ProductDetailConfig.create({
              productdetailId: productdetail.id,
              colorId: data.color,
              romId: data.rom,
              screen: data.screen,
              os: data.os,
              frontcam: data.frontcam,
              backcam: data.backcam,
              cpu: data.cpu,
              ram: data.ram,
              sim: data.sim,
              battery: data.battery,
              design: data.design,
              warrantyId: data.warranty,
            });
          }
        }
        resolve({
          errCode: 0,
          errMessage: "Add new product successfully!",
        });
      }
    } catch (error) {
      reject(error);
    }
  });
};

export const updateProduct = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.id || !data.categoryId || !data.brandId) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameter!",
        });
      } else {
        let product = await db.Product.findOne({
          where: { id: data.id },
          raw: false,
        });
        if (product) {
          product.name = data.name;
          product.madeby = data.madeby;
          product.brandId = data.brandId;
          product.categoryId = data.categoryId;
          product.contentMarkdown = data.contentMarkdown;
          product.contentHTML = data.contentHTML;

          await product.save();
          resolve({
            errCode: 0,
            errMessage: "Edit product successfully!",
          });
        }
      }
    } catch (error) {
      reject(error);
    }
  });
};

//phan trang
export const getAllProductAdmin = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      let objectFilter = {
        include: [
          { model: db.Allcode, as: "brandData", attributes: ["value", "code"] },
          {
            model: db.Allcode,
            as: "categoryData",
            attributes: ["value", "code"],
          },
          {
            model: db.Allcode,
            as: "statusData",
            attributes: ["value", "code"],
          },
        ],
        order: [["createdAt", "DESC"]],
        raw: true,
        nest: true,
      };
      if (data.limit && data.offset) {
        objectFilter.limit = +data.limit;
        objectFilter.offset = +data.offset;
      }

      if (data.categoryId && data.categoryId !== "ALL")
        objectFilter.where = { categoryId: data.categoryId };
      if (data.brandId && data.brandId !== "ALL")
        objectFilter.where = { ...objectFilter.where, brandId: data.brandId };
      if (data.sortName === "true") objectFilter.order = [["name", "ASC"]];
      if (data.keyword !== "")
        objectFilter.where = {
          ...objectFilter.where,
          name: { [Op.substring]: data.keyword },
        };

      let res = await db.Product.findAndCountAll(objectFilter);

      for (let i = 0; i < res.rows.length; i++) {
        let objectFilterProductDetail = {
          where: { productId: res.rows[i].id },
          raw: true,
        };

        res.rows[i].productDetail = await db.ProductDetail.findAll(
          objectFilterProductDetail
        );

        for (let j = 0; j < res.rows[i].productDetail.length; j++) {
          res.rows[i].productDetail[j].productdetailconfig =
            await db.ProductDetailConfig.findAll({
              where: { productdetailId: res.rows[i].productDetail[j].id },
              raw: true,
            });

          res.rows[i].price = res.rows[i].productDetail[0].discountPrice;
          res.rows[i].productDetail[j].productImage =
            await db.ProductImage.findAll({
              where: { productdetailId: res.rows[i].productDetail[j].id },
              raw: true,
            });
          for (
            let k = 0;
            k < res.rows[i].productDetail[j].productImage.length > 0;
            k++
          ) {
            res.rows[i].productDetail[j].productImage[k].image = new Buffer(
              res.rows[i].productDetail[j].productImage[k].image,
              "base64"
            ).toString("binary");
          }
        }
      }
      if (data.sortPrice && data.sortPrice === "true") {
        res.rows.sort(dynamicSortMultiple("price"));
      }

      resolve({
        errCode: 0,
        count: res.count,
        data: res.rows,
      });
    } catch (error) {
      reject(error);
    }
  });
};
export const getAllProductUser = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      let objectFilter = {
        where: { statusId: "S1" },
        include: [
          { model: db.Allcode, as: "brandData", attributes: ["value", "code"] },
          {
            model: db.Allcode,
            as: "categoryData",
            attributes: ["value", "code"],
          },
          {
            model: db.Allcode,
            as: "statusData",
            attributes: ["value", "code"],
          },
        ],
        raw: true,
        nest: true,
      };
      if (data.limit && data.offset) {
        objectFilter.limit = +data.limit;
        objectFilter.offset = +data.offset;
      }

      if (data.categoryId && data.categoryId !== "ALL")
        objectFilter.where = { categoryId: data.categoryId };
      if (data.brandId && data.brandId !== "ALL")
        objectFilter.where = { ...objectFilter.where, brandId: data.brandId };
      if (data.sortName === "true") objectFilter.order = [["name", "ASC"]];

      // if (data.sortPrice === "true") {
      //   objectFilter.order = [["discountPrice", "ASC"]]; // Sắp xếp theo giá tăng dần
      // }
      // if (data.sortPrice === "false") {
      //   objectFilter.order = [["discountPrice", "DESC"]];
      // }

      if (data.keyword !== "")
        objectFilter.where = {
          ...objectFilter.where,
          name: { [Op.substring]: data.keyword },
        };

      let res = await db.Product.findAndCountAll(objectFilter);
      for (let i = 0; i < res.rows.length; i++) {
        let objectFilterProductDetail = {
          where: { productId: res.rows[i].id },
          raw: true,
        };

        res.rows[i].productDetail = await db.ProductDetail.findAll(
          objectFilterProductDetail
        );

        for (let j = 0; j < res.rows[i].productDetail.length; j++) {
          res.rows[i].productDetail[j].productdetailconfig =
            await db.ProductDetailConfig.findAll({
              where: { productdetailId: res.rows[i].productDetail[j].id },
              raw: true,
            });

          res.rows[i].price = res.rows[i].productDetail[0].discountPrice;
          res.rows[i].productDetail[j].productImage =
            await db.ProductImage.findAll({
              where: { productdetailId: res.rows[i].productDetail[j].id },
              raw: true,
            });
          for (
            let k = 0;
            k < res.rows[i].productDetail[j].productImage.length > 0;
            k++
          ) {
            res.rows[i].productDetail[j].productImage[k].image = new Buffer(
              res.rows[i].productDetail[j].productImage[k].image,
              "base64"
            ).toString("binary");
          }
        }
      }
      if (data.sortPrice && data.sortPrice === "true") {
        res.rows.sort(dynamicSortMultiple("price"));
      }

      resolve({
        errCode: 0,
        count: res.count,
        data: res.rows,
      });
    } catch (error) {
      reject(error);
    }
  });
};

export const UnactiveProduct = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.id) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameter!",
        });
      } else {
        let product = await db.Product.findOne({
          where: { id: data.id },
          raw: false,
        });
        if (!product) {
          resolve({
            errCode: 2,
            errMessage: `The product isn't exist`,
          });
        } else {
          product.statusId = "S2";
          await product.save();
          resolve({
            errCode: 0,
            errMessage: "Unactive product successfully!",
          });
        }
      }
    } catch (error) {
      reject(error);
    }
  });
};

export const ActiveProduct = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.id) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameter!",
        });
      } else {
        let product = await db.Product.findOne({
          where: { id: data.id },
          raw: false,
        });
        if (!product) {
          resolve({
            errCode: 2,
            errMessage: `The product isn't exist`,
          });
        } else {
          product.statusId = "S1";
          await product.save();
          resolve({
            errCode: 0,
            errMessage: "Active product successfully!",
          });
        }
      }
    } catch (error) {
      reject(error);
    }
  });
};

export const createNewProductDetail = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (
        !data.image ||
        !data.nameDetail ||
        !data.originalPrice ||
        !data.discountPrice ||
        !data.id
      ) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameter!",
        });
      } else {
        let productdetail = await db.ProductDetail.create({
          productId: data.id,
          description: data.description,
          originalPrice: data.originalPrice,
          discountPrice: data.discountPrice,
          nameDetail: data.nameDetail,
        });
        if (productdetail) {
          await db.ProductImage.create({
            productdetailId: productdetail.id,
            image: data.image,
          });
          await db.ProductDetailConfig.create({
            productdetailId: productdetail.id,
            color: data.color,
            romId: data.rom,
            screen: data.screen,
            os: data.os,
            backcam: data.backcam,
            cpu: data.cpu,
            ram: data.ram,
            sim: data.sim,
            battery: data.battery,
            design: data.design,
            warrantyId: data.warranty,
          });
        }
        resolve({
          errCode: 0,
          errMessage: "ok",
        });
      }
    } catch (error) {
      reject(error);
    }
  });
};

export const updateProductDetail = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (
        !data.nameDetail ||
        !data.originalPrice ||
        !data.discountPrice ||
        !data.id
      ) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameter!",
        });
      } else {
        let productDetail = await db.ProductDetail.findOne({
          where: { id: data.id },
          raw: false,
        });
        if (productDetail) {
          productDetail.nameDetail = data.nameDetail;
          productDetail.originalPrice = data.originalPrice;
          productDetail.discountPrice = data.discountPrice;
          productDetail.description = data.description;
          await productDetail.save();
          resolve({
            errCode: 0,
            errMessage: "Update product detail successfully!",
          });
        } else {
          resolve({
            errCode: 2,
            errMessage: "Product not found!",
          });
        }
      }
    } catch (error) {
      reject(error);
    }
  });
};

export const getDetailProductDetailById = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!id) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameter!",
        });
      } else {
        let productdetail = await db.ProductDetail.findOne({
          where: { id: id },
        });

        resolve({
          errCode: 0,
          data: productdetail,
        });
      }
    } catch (error) {
      reject(error);
    }
  });
};

export const createNewProductDetailImage = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.image || !data.caption || !data.id) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameter!",
        });
      } else {
        await db.ProductImage.create({
          productdetailId: data.id,
          caption: data.caption,
          image: data.image,
        });
        resolve({
          errCode: 0,
          errMessage: "Create new product detail image successfully!",
        });
      }
    } catch (error) {
      reject(error);
    }
  });
};

//new 23/5
export const createNewSeriNumber = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.id || !data.seriNumber) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameter!",
        });
      } else {
        await db.SeriNumber.create({
          productdetaiconfiglId: data.id,
          seriNumber: data.seriNumber,
          statusId: "SR1",
          checkWarranty: data.checkWarranty,
          review: data.review,
        });
        resolve({
          errCode: 0,
          errMessage: "Create new SeriNumber successfully!",
        });
      }
    } catch (error) {
      reject(error);
    }
  });
};
//new 23/5
export const updateSeriNumber = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.id) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameter!",
        });
      } else {
        let seri = await db.SeriNumber.findOne({
          where: { id: data.id },
          raw: false,
        });
        if (seri) {
          seri.seriNumber = data.seriNumber;
          seri.statusId = data.statusId;
          seri.checkWarranty = data.checkWarranty;
          seri.review = data.review;
          await seri.save();
          resolve({
            errCode: 0,
            errMessage: "Update seriNumber successfully!",
          });
        } else {
          resolve({
            errCode: 2,
            errMessage: "seriNumber not found!",
          });
        }
      }
    } catch (error) {
      reject(error);
    }
  });
};

export const deleteSeriNumber = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.id) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameter!",
        });
      } else {
        let productImage = await db.SeriNumber.findOne({
          where: { id: data.id },
          raw: false,
        });
        if (productImage) {
          await db.SeriNumber.destroy({
            where: { id: data.id },
          });
          resolve({
            errCode: 0,
            errMessage: "Delete seriNumber successfully!",
          });
        } else {
          resolve({
            errCode: 2,
            errMessage: "seriNumber not found!",
          });
        }
      }
    } catch (error) {
      reject(error);
    }
  });
};
//new 23/5
export const getDetailProductImageById = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!id) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameter!",
        });
      } else {
        let productdetailImage = await db.ProductImage.findOne({
          where: { id: id },
        });
        if (productdetailImage) {
          productdetailImage.image = new Buffer(
            productdetailImage.image,
            "base64"
          ).toString("binary");
        }
        resolve({
          errCode: 0,
          data: productdetailImage,
        });
      }
    } catch (error) {
      reject(error);
    }
  });
};

export const updateProductDetailImage = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.id || !data.image) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameter!",
        });
      } else {
        let productImage = await db.ProductImage.findOne({
          where: { id: data.id },
          raw: false,
        });
        if (productImage) {
          productImage.caption = data.caption;
          productImage.image = data.image;

          await productImage.save();
          resolve({
            errCode: 0,
            errMessage: "Update product detail image successfully!",
          });
        } else {
          resolve({
            errCode: 2,
            errMessage: "Product Image not found!",
          });
        }
      }
    } catch (error) {
      reject(error);
    }
  });
};

export const deleteProductDetailImage = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.id) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameter!",
        });
      } else {
        let productImage = await db.ProductImage.findOne({
          where: { id: data.id },
          raw: false,
        });
        if (productImage) {
          await db.ProductImage.destroy({
            where: { id: data.id },
          });
          resolve({
            errCode: 0,
            errMessage: "Delete product detail image successfully!",
          });
        } else {
          resolve({
            errCode: 2,
            errMessage: "Product Image not found!",
          });
        }
      }
    } catch (error) {
      reject(error);
    }
  });
};

export const deleteProductDetail = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.id) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameter!",
        });
      } else {
        let productDetail = await db.ProductDetail.findOne({
          where: { id: data.id },
        });
        if (productDetail) {
          await db.ProductDetail.destroy({
            where: { id: data.id },
          });

          let productImg = await db.ProductImage.findOne({
            where: { productdetailId: data.id },
          });
          let productColor = await db.ProductDetailConfig.findOne({
            where: { productdetailId: data.id },
          });
          let productRom = await db.ProductDetailConfig.findOne({
            where: { productdetailId: data.id },
          });

          if (productImg) {
            await db.ProductImage.destroy({
              where: { productdetailId: data.id },
            });
          }
          if (productColor || productRom) {
            await db.ProductDetailConfig.destroy({
              where: { productdetailId: data.id },
            });
          }
          resolve({
            errCode: 0,
            errMessage: "Delete product detail successfully!",
          });
        } else {
          resolve({
            errCode: 2,
            errMessage: "Product Image not found!",
          });
        }
      }
    } catch (error) {
      reject(error);
    }
  });
};

export const getAllProductDetailConfigById = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.id || !data.limit || !data.offset) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameter!",
        });
      } else {
        let productsize = await db.ProductDetailConfig.findAndCountAll({
          where: { productdetailId: data.id },
          limit: +data.limit,
          offset: +data.offset,
          include: [
            {
              model: db.Allcode,
              as: "romData",
              attributes: ["value", "code"],
            },
            {
              model: db.Allcode,
              as: "colorData",
              attributes: ["value", "code"],
            },
            {
              model: db.Allcode,
              as: "warrantyData",
              attributes: ["value", "code"],
            },
          ],
          raw: true,
          nest: true,
        });
        for (let i = 0; i < productsize.rows.length > 0; i++) {
          let receiptDetail = await db.ReceiptDetail.findAll({
            where: { productdetailconfigId: productsize.rows[i].id },
          });
          let orderDetail = await db.OrderDetail.findAll({
            where: { productId: productsize.rows[i].id },
          });
          let quantity = 0;
          for (let j = 0; j < receiptDetail.length; j++) {
            quantity = quantity + receiptDetail[j].quantity;
          }
          for (let k = 0; k < orderDetail.length; k++) {
            let order = await db.OrderProduct.findOne({
              where: { id: orderDetail[k].orderId },
            });
            if (order.statusId != "S7") {
              quantity = quantity - orderDetail[k].quantity;
            }
          }

          productsize.rows[i].stock = quantity;
        }
        resolve({
          errCode: 0,
          data: productsize.rows,
          count: productsize.count,
        });
      }
    } catch (error) {
      reject(error);
    }
  });
};

export const createNewProductDetailConfig = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.productdetailId || !data.romId) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameter!",
        });
      } else {
        await db.ProductDetailConfig.create({
          productdetailId: data.productdetailId,
          colorId: data.colorId,
          romId: data.romId,
          screen: data.screen,
          os: data.os,
          backcam: data.backcam,
          frontcam: data.frontcam,
          cpu: data.cpu,
          ram: data.ram,
          sim: data.sim,
          battery: data.battery,
          design: data.design,
          warrantyId: data.warrantyId,
        });
        resolve({
          errCode: 0,
          errMessage: "Create new product detail config successfully!",
        });
      }
    } catch (error) {
      reject(error);
    }
  });
};

export const getDetailProductDetailConfigById = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!id) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameter!",
        });
      } else {
        let res = await db.ProductDetailConfig.findOne({
          where: { id: id },
        });
        resolve({
          errCode: 0,
          data: res,
        });
      }
    } catch (error) {
      reject(error);
    }
  });
};

export const updateProductDetailConfig = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.id || !data.romId) {
        resolve({
          errCode: 1,
          // dung badrequest
          errMessage: "Missing required parameter xxx!",
        });
      } else {
        let res = await db.ProductDetailConfig.findOne({
          where: { id: data.id },
          raw: false,
        });
        if (res) {
          res.colorId = data.colorId;
          res.romId = data.romId;
          res.screen = data.screen;
          res.os = data.os;
          res.backcam = data.backcam;
          res.frontcam = data.frontcam;
          res.cpu = data.cpu;
          res.ram = data.ram;
          res.sim = data.sim;
          res.battery = data.battery;
          res.design = data.design;
          res.warrantyId = data.warrantyId;
          await res.save();

          // await db.OrderDetail.update(
          //   {
          //     colorId: data.colorId,
          //     romId: data.romId,
          //     screen: data.screen,
          //     os: data.height,
          //     backcam: data.backcam,
          //     frontcam: data.frontcam,
          //     cpu: data.cpu,
          //     ram: data.ram,
          //     sim: data.sim,
          //     battery: data.battery,
          //     design: data.design,
          //     warrantyId: data.warranty,
          //     serialNumber: data.serialNumber,
          //   },
          //   {
          //     where: {
          //       id: data.id,
          //     },
          //   }
          // );

          //check
          resolve({
            errCode: 0,
            errMessage: "Update product detail config successfully!",
          });
        } else {
          resolve({
            errCode: 2,
            errMessage: "Product Image not found!",
          });
        }
      }
    } catch (error) {
      reject(error);
    }
  });
};

export const deleteProductDetailConfig = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.id) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameter!",
        });
      } else {
        let res = await db.ProductDetailConfig.findOne({
          where: { id: data.id },
          raw: false,
        });
        if (res) {
          await db.ProductDetailConfig.destroy({
            where: { id: data.id },
          });
          resolve({
            errCode: 0,
            errMessage: "Delete product detail config successfully!",
          });
        } else {
          resolve({
            errCode: 2,
            errMessage: "Product detail config not found!",
          });
        }
      }
    } catch (error) {
      reject(error);
    }
  });
};

export const getProductFeature = (limit) => {
  return new Promise(async (resolve, reject) => {
    try {
      let res = await db.Product.findAll({
        include: [
          { model: db.Allcode, as: "brandData", attributes: ["value", "code"] },
          {
            model: db.Allcode,
            as: "categoryData",
            attributes: ["value", "code"],
          },
          {
            model: db.Allcode,
            as: "statusData",
            attributes: ["value", "code"],
          },
        ],

        limit: +limit,
        order: [["view", "DESC"]],
        raw: true,
        nest: true,
      });
      for (let i = 0; i < res.length; i++) {
        let objectFilterProductDetail = {
          where: { productId: res[i].id },
          raw: true,
        };

        res[i].productDetail = await db.ProductDetail.findAll(
          objectFilterProductDetail
        );

        for (let j = 0; j < res[i].productDetail.length; j++) {
          res[i].productDetail[j].productdetailconfig =
            await db.ProductDetailConfig.findAll({
              where: { productdetailId: res[i].productDetail[j].id },
              raw: true,
            });

          res[i].price = res[i].productDetail[0].discountPrice;
          res[i].productDetail[j].productImage = await db.ProductImage.findAll({
            where: { productdetailId: res[i].productDetail[j].id },
            raw: true,
          });
          for (
            let k = 0;
            k < res[i].productDetail[j].productImage.length > 0;
            k++
          ) {
            res[i].productDetail[j].productImage[k].image = new Buffer(
              res[i].productDetail[j].productImage[k].image,
              "base64"
            ).toString("binary");
          }
        }
      }

      resolve({
        errCode: 0,
        data: res,
      });
    } catch (error) {
      reject(error);
    }
  });
};
//new 23/5
function checkWarranty(startDate) {
  const startDateObject = new Date(startDate);
  const today = new Date();

  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  if (today > startDateObject) {
    return `Sản phẩm đã hết hạn bảo hành từ ngày: ${startDateObject.toLocaleDateString(
      "vi-VN",
      options
    )}`;
  } else {
    return `Còn bảo hành hành đến ngày: ${startDateObject.toLocaleDateString(
      "vi-VN",
      options
    )}`;
  }
}

function formatDateToText(dateString) {
  const date = new Date(dateString);
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return date.toLocaleDateString("vi-VN", options);
}
//new 23/5
export const checkWarrantyAPI = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await db.OrderDetailSeri.findOne({
        where: { seriNumber: data.seriNumber },
        raw: true,
        nest: true,
      });
      if (!res) {
        resolve({
          errCode: -1,
          errMessage: "Không tìm thấy thông tin bảo hành!",
        });
      }
      //new 23/5
      const checkOrderdetail = await db.OrderDetail.findOne({
        where: { id: res.orderdetailId },
        raw: true,
        nest: true,
      });
      //new 23/5
      const checkS6 = await db.OrderProduct.findOne({
        where: { id: checkOrderdetail.orderId, statusId: "S6" },
        raw: true,
        nest: true,
      });

      if (!checkS6) {
        resolve({
          errCode: 1,
          errMessage: "Không tìm thấy thông tin bảo hành!",
        });
      }
      //new 23/5

      //new 23/5
      const getProductDetailId = await db.ProductDetailConfig.findOne({
        where: { id: checkOrderdetail.productId },
        include: [{ model: db.Allcode, as: "romData" }],
        raw: true,
        nest: true,
      });

      const monthOfWarranty = +getProductDetailId.warrantyId;

      //hiển thị ngày mua
      const dateString = checkS6.updatedAt;
      const formattedDate = formatDateToText(dateString);

      const originalDate = moment(dateString);
      // Thêm 6 tháng vào ngày ban đầu
      const sixMonthsLater = originalDate.add(monthOfWarranty, "months");

      // Lấy ngày tiếp theo của tháng được tính
      const nextDay = sixMonthsLater.clone().add(1, "day");

      const warrantyStatus = checkWarranty(nextDay);

      ///kh lien quan
      const getProductId = await db.ProductDetail.findOne({
        where: { id: getProductDetailId.productdetailId },
        raw: true,
        nest: true,
      });

      const getImageId = await db.ProductImage.findOne({
        where: { productdetailId: getProductDetailId.productdetailId },
        raw: true,
        nest: true,
      });
      if (getImageId) {
        getImageId.image = new Buffer(getImageId.image, "base64").toString(
          "binary"
        );

        const getProductName = await db.Product.findOne({
          where: { id: getProductId.productId },
          raw: true,
          nest: true,
        });

        const nameProduct =
          getProductName.name +
          "-" +
          getProductId.nameDetail +
          "-" +
          getProductDetailId.romData.value;

        resolve({
          errCode: 0,
          nameProdudct: `Sản Phẩm: ${nameProduct}`,
          serialNumber: `Số Sê-ri: ${data.seriNumber}`,
          messBuyDate: `Ngày mua: ${formattedDate}`,
          messWarranty: warrantyStatus,
          image: getImageId.image,
        });
      }
    } catch (error) {
      reject(error);
    }
  });
};

export const getProductNew = (limit) => {
  return new Promise(async (resolve, reject) => {
    try {
      let res = await db.Product.findAll({
        include: [
          { model: db.Allcode, as: "brandData", attributes: ["value", "code"] },
          {
            model: db.Allcode,
            as: "categoryData",
            attributes: ["value", "code"],
          },
          {
            model: db.Allcode,
            as: "statusData",
            attributes: ["value", "code"],
          },
        ],
        limit: +limit,
        order: [["createdAt", "DESC"]],
        where: { statusId: "S1" },
        raw: true,
        nest: true,
      });

      for (let i = 0; i < res.length; i++) {
        let objectFilterProductDetail = {
          where: { productId: res[i].id },
          raw: true,
        };

        res[i].productDetail = await db.ProductDetail.findAll(
          objectFilterProductDetail
        );

        for (let j = 0; j < res[i].productDetail.length; j++) {
          res[i].productDetail[j].productdetailconfig =
            await db.ProductDetailConfig.findAll({
              where: { productdetailId: res[i].productDetail[j].id },
              raw: true,
            });

          res[i].price = res[i].productDetail[0].discountPrice;
          res[i].productDetail[j].productImage = await db.ProductImage.findAll({
            where: { productdetailId: res[i].productDetail[j].id },
            raw: true,
          });
          for (
            let k = 0;
            k < res[i].productDetail[j].productImage.length > 0;
            k++
          ) {
            res[i].productDetail[j].productImage[k].image = new Buffer(
              res[i].productDetail[j].productImage[k].image,
              "base64"
            ).toString("binary");
          }
        }
      }

      resolve({
        errCode: 0,
        data: res,
      });
    } catch (error) {
      reject(error);
    }
  });
};
//them vao - done
// lất tất cả chi tiết sản phẩm qua id sản phẩm
export const getAllProductDetailById = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      //đã bỏ điều kiện !data.limit || !data.offset
      if (!data.id) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameter!",
        });
      } else {
        let productdetail = await db.ProductDetail.findAndCountAll({
          where: { productId: data.id },
          limit: +data.limit,
          offset: +data.offset,
        });

        if (productdetail.rows && productdetail.rows.length > 0) {
          for (let i = 0; i < productdetail.rows.length; i++) {
            productdetail.rows[i].productImageData =
              await db.ProductImage.findAll({
                where: { productdetailId: productdetail.rows[i].id },
              });
            //sua them
            productdetail.rows[i].productconfig =
              await db.ProductDetailConfig.findAll({
                where: { productdetailId: productdetail.rows[i].id },
              });
            if (
              productdetail.rows[i].productImageData &&
              productdetail.rows[i].productImageData.length > 0
            ) {
              for (
                let j = 0;
                j < productdetail.rows[i].productImageData.length > 0;
                j++
              ) {
                productdetail.rows[i].productImageData[j].image = new Buffer(
                  productdetail.rows[i].productImageData[j].image,
                  "base64"
                ).toString("binary");
              }
            }
          }
        }
        resolve({
          errCode: 0,
          count: productdetail.count,
          data: productdetail.rows,
        });
      }
    } catch (error) {
      reject(error);
    }
  });
};
//them vao doing
// lấy tất cả ảnh qua productdetailId
export const getAllProductDetailImageById = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.id || !data.limit || !data.offset) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameter!",
        });
      } else {
        let productImage = await db.ProductImage.findAndCountAll({
          where: { productdetailId: data.id },
          limit: +data.limit,
          offset: +data.offset,
        });
        if (productImage.rows && productImage.rows.length > 0) {
          productImage.rows.map(
            (item) =>
              (item.image = new Buffer(item.image, "base64").toString("binary"))
          );
        }
        resolve({
          errCode: 0,
          count: productImage.count,
          data: productImage.rows,
        });
      }
    } catch (error) {
      reject(error);
    }
  });
};
//them vao - done
export const getDetailProductById = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!id) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameter!",
        });
      } else {
        let res = await db.Product.findOne({
          where: { id: id },
          include: [
            {
              model: db.Allcode,
              as: "brandData",
              attributes: ["value", "code"],
            },
            {
              model: db.Allcode,
              as: "categoryData",
              attributes: ["value", "code"],
            },
            {
              model: db.Allcode,
              as: "statusData",
              attributes: ["value", "code"],
            },
          ],
          raw: true,
          nest: true,
        });
        // tính view
        let product = await db.Product.findOne({
          where: { id: id },
          raw: false,
        });
        product.view = product.view + 1;
        await product.save();

        //tìm xem sản phẩm có thêm màu nào khác không - vì khi create product đã có 1 sản phẩm sẵn rồi
        res.productDetail = await db.ProductDetail.findAll({
          where: { productId: res.id },
          raw: true,
          nest: true,
        });

        for (let i = 0; i < res.productDetail.length > 0; i++) {
          res.productDetail[i].productImage = await db.ProductImage.findAll({
            where: { productdetailId: res.productDetail[i].id },
            raw: true,
            nest: true,
          });
          res.productDetail[i].productDetailConfig =
            await db.ProductDetailConfig.findAll({
              where: { productdetailId: res.productDetail[i].id },
              raw: true,
              nest: true,
              include: [
                {
                  model: db.Allcode,
                  as: "colorData",
                  attributes: ["value", "code"],
                },
                {
                  model: db.Allcode,
                  as: "romData",
                  attributes: ["value", "code"],
                },
              ],
            });
          //new 23/5
          // for (
          //   let j = 0;
          //   j < res.productDetail[i].productDetailConfig.length;
          //   j++
          // ) {
          //   res.productDetail[i].productDetailConfig[j].seri =
          //     await db.SeriNumber.findAll({
          //       where: {
          //         productdetaiconfiglId:
          //           res.productDetail[i].productDetailConfig[j].id,
          //       },
          //       raw: true,
          //       nest: true,
          //     });
          // }
          //new 23/5
          for (let j = 0; j < res.productDetail[i].productImage.length; j++) {
            res.productDetail[i].productImage[j].image = new Buffer(
              res.productDetail[i].productImage[j].image,
              "base64"
            ).toString("binary");
          }

          //tính số lượng
          for (
            let k = 0;
            k < res.productDetail[i].productDetailConfig.length;
            k++
          ) {
            let receiptDetail = await db.ReceiptDetail.findAll({
              where: {
                //check lai ten id nay o cac api khac
                productdetailconfigId:
                  res.productDetail[i].productDetailConfig[k].id,
              },
              raw: true,
              nest: true,
            });

            let orderDetail = await db.OrderDetail.findAll({
              where: {
                productId: res.productDetail[i].productDetailConfig[k].id,
              },
              raw: true,
              nest: true,
            });

            let quantity = 0;
            for (let g = 0; g < receiptDetail.length; g++) {
              quantity = quantity + receiptDetail[g].quantity;
            }

            for (let h = 0; h < orderDetail.length; h++) {
              let order = await db.OrderProduct.findOne({
                where: { id: orderDetail[h].orderId },
                raw: true,
                nest: true,
              });
              if (order.statusId != "S7") {
                quantity = quantity - orderDetail[h].quantity;
              }
            }

            res.productDetail[i].productDetailConfig[k].stock = quantity;
          }
        }
        resolve({
          errCode: 0,
          data: res,
        });
      }
    } catch (error) {
      reject(error);
    }
  });
};

export const getProductShopCart = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      let productArr = [];
      if (!data.userId && !data.limit) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameter!",
        });
      } else {
        let shopcart = await db.ShopCart.findAll({
          where: { userId: data.userId },
        });

        for (let i = 0; i < shopcart.length; i++) {
          let productDetailSize = await db.ProductDetailSize.findOne({
            where: { id: shopcart[i].productdetailsizeId },
          });

          let productDetail = await db.ProductDetail.findOne({
            where: { id: productDetailSize.productdetailId },
          });

          let product = await db.Product.findOne({
            where: { id: productDetail.productId },
            include: [
              {
                model: db.Allcode,
                as: "brandData",
                attributes: ["value", "code"],
              },
              {
                model: db.Allcode,
                as: "categoryData",
                attributes: ["value", "code"],
              },
              {
                model: db.Allcode,
                as: "statusData",
                attributes: ["value", "code"],
              },
            ],

            limit: +data.limit,
            order: [["view", "DESC"]],
            raw: true,
            nest: true,
          });
          productArr.push(product);
        }

        if (productArr && productArr.length > 0) {
          for (let g = 0; g < productArr.length; g++) {
            let objectFilterProductDetail = {
              where: { productId: productArr[g].id },
              raw: true,
            };

            productArr[g].productDetail = await db.ProductDetail.findAll(
              objectFilterProductDetail
            );

            for (let j = 0; j < productArr[g].productDetail.length; j++) {
              productArr[g].productDetail[j].productDetailSize =
                await db.ProductDetailSize.findAll({
                  where: { productdetailId: productArr[g].productDetail[j].id },
                  raw: true,
                });

              productArr[g].price =
                productArr[g].productDetail[0].discountPrice;
              productArr[g].productDetail[j].productImage =
                await db.ProductImage.findAll({
                  where: { productdetailId: productArr[g].productDetail[j].id },
                  raw: true,
                });
              for (
                let k = 0;
                k < productArr[g].productDetail[j].productImage.length > 0;
                k++
              ) {
                productArr[g].productDetail[j].productImage[k].image =
                  new Buffer(
                    productArr[g].productDetail[j].productImage[k].image,
                    "base64"
                  ).toString("binary");
              }
            }
          }
        }
      }
      resolve({
        errCode: 0,
        data: productArr,
      });
    } catch (error) {
      reject(error);
    }
  });
};

export const getAllSeriNumber = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.id || !data.limit || !data.offset) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameter!",
        });
      } else {
        let seriAll = await db.SeriNumber.findAndCountAll({
          where: { productdetaiconfiglId: data.id },
          limit: +data.limit,
          offset: +data.offset,
        });

        resolve({
          errCode: 0,
          count: seriAll.count,
          data: seriAll.rows,
        });
      }
    } catch (error) {
      reject(error);
    }
  });
};
