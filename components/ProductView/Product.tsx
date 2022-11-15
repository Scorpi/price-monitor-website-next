import { Tooltip } from "@mui/material"
import clsx from "clsx"
import { DateTime } from "luxon"
import React from "react"
import styles from "../../components/ProductView/Product.module.css"
import { formatUom, getUpdatedAt, splitPrice } from "../../functions/products"
import { PriceHistoryModel, ProductPriceModel, ProductWithPriceModel, ShopType } from "../../models/Product"
import { getShopName, ShopIcon } from "../shops"
import { ProductHistoryGraph } from "./ProductHistoryGraph"

const locale = "ru"

const ProductImage: React.FC<{ url: string }> = ({ url }) => {
  return (
    <div className="h-60 sm:h-80 mx-auto flex justify-center items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="max-w-full max-h-full" src={url} alt="Photo" />
    </div>
  )
}

const ProductPrice: React.FC<{
  price: ProductPriceModel
  shopType: ShopType
  uom: string
}> = ({ price, shopType, uom }) => {
  if (!price) {
    return <></>
  }
  const isDiscount = price.price !== price.basePrice
  const [priceWhole, priceDecimal] = splitPrice(price.price)
  const {
    isOutdated,
    dateString,
  } = getUpdatedAt(price.time)
  return (
    <div className="flex flex-row items-center py-4 flex-wrap">
      <ShopIcon shopType={shopType} className={styles.shopIcon} />
      <div className="flex flex-col mr-4">
        <span className={styles.shopName}>{getShopName(shopType)}</span>
        {/*<span className={clsx(styles.shopSubtitle, styles.decreasedLineHeight)}>10 часов назад</span>*/}
        {price.unitPrice && (
          <span className={styles.shopSubtitle}>
            {price.unitPrice.toFixed(2)}₽/{uom}
          </span>
        )}
      </div>
      <div className="flex flex-col ml-auto">
        {isDiscount
          && (
            <span className={styles.priceSecondary}>
              {price.offerValidUntil && (
                <span>
                  по {DateTime.fromISO(price.offerValidUntil).setLocale(locale).toFormat("d MMM")} • {" "}
                </span>
              )}
              <span className="line-through">{Number(price.basePrice).toFixed(2)}₽</span>
            </span>
          )}
        <Tooltip
          title={dateString}
          arrow
          disableFocusListener
          enterTouchDelay={250}
          placement="left"
        >
          <span
            className={clsx(
              "align-baseline font-bold text-2xl shrink-0 sm:text-3xl",
              styles.priceMain,
              isOutdated && "text-gray-400",
            )}
          >
            {priceWhole}
            <span className="align-text-top text-base sm:text-lg">
              <span className="w-0 inline-block opacity-0">.</span>
              {priceDecimal}
            </span>
          </span>
        </Tooltip>
      </div>
    </div>
  )
}

type PriceHistoryProps = { isLoading: boolean; history: PriceHistoryModel | null }

const ProductHistory: React.FC<PriceHistoryProps> = ({ isLoading, history }) => {
  if (isLoading || !history) {
    return <div>Загрузка…</div>
  }
  return <ProductHistoryGraph history={history} />
}

export const Product: React.FC<{ product: ProductWithPriceModel; priceHistory: PriceHistoryProps }> = (
  { product, priceHistory },
) => {
  const uom = formatUom(product)
  return (
    <>
      <div className="flex flex-col">
        {product.photoUrl && <ProductImage url={product.photoUrl} />}
        <h1 className={clsx("font-semibold mt-4", product.name.length > 40 ? "text-xl" : "text-2xl")}>
          {product.name}
        </h1>
        {product.ean && <p className="text-gray-500">Арт. {product.ean}</p>}
        <div className={clsx("my-2", styles.prices)}>
          {product.shops.map((price, index) => (
            <ProductPrice key={index} price={price} shopType={price.shopType} uom={uom} />
          ))}
        </div>
      </div>
      <ProductHistory isLoading={priceHistory.isLoading} history={priceHistory.history} />
    </>
  )
}
